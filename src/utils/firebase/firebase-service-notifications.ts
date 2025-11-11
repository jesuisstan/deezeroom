import { Platform } from 'react-native';

import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';

import { Logger } from '@/components/modules/logger';
import { auth, db } from '@/utils/firebase/firebase-init';

export interface PushTokenDocument {
  userId: string;
  installationId: string;
  expoPushToken?: string | null;
  devicePushToken?: string | null;
  platform: 'ios' | 'android' | 'web';
  lastUpdated?: any;
}

const INSTALLATION_ID_SECURE_KEY = 'deezeroom.installation-id';
const INSTALLATION_ID_STORAGE_KEY = 'deezeroom.installation-id';

class NotificationService {
  private static instance: NotificationService;
  private currentExpoPushToken: string | null = null;
  private installationId: string | null = null;
  // Base document title for web badge rendering
  private baseWebTitle: string | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private generateInstallationId(): string {
    return `${Platform.OS}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  private async getStoredInstallationId(): Promise<string | null> {
    try {
      if (
        typeof SecureStore?.isAvailableAsync === 'function' &&
        (await SecureStore.isAvailableAsync()) === true
      ) {
        const stored = await SecureStore.getItemAsync(
          INSTALLATION_ID_SECURE_KEY
        );
        if (stored) {
          return stored;
        }
      }
    } catch (error) {
      Logger.warn(
        'Failed to read installation id from secure storage',
        error,
        '🔔 NotificationService'
      );
    }

    try {
      const maybeWindow = globalThis as any;
      const stored = maybeWindow?.localStorage?.getItem?.(
        INSTALLATION_ID_STORAGE_KEY
      );
      if (typeof stored === 'string' && stored.length > 0) {
        return stored;
      }
    } catch (error) {
      Logger.warn(
        'Failed to read installation id from local storage',
        error,
        '🔔 NotificationService'
      );
    }

    return null;
  }

  private async persistInstallationId(id: string): Promise<void> {
    try {
      if (
        typeof SecureStore?.isAvailableAsync === 'function' &&
        (await SecureStore.isAvailableAsync()) === true
      ) {
        await SecureStore.setItemAsync(INSTALLATION_ID_SECURE_KEY, id);
      }
    } catch (error) {
      Logger.warn(
        'Failed to persist installation id to secure storage',
        error,
        '🔔 NotificationService'
      );
    }

    try {
      const maybeWindow = globalThis as any;
      maybeWindow?.localStorage?.setItem?.(INSTALLATION_ID_STORAGE_KEY, id);
    } catch (error) {
      Logger.warn(
        'Failed to persist installation id to local storage',
        error,
        '🔔 NotificationService'
      );
    }
  }

  private async ensureInstallationId(): Promise<string> {
    if (this.installationId) {
      return this.installationId;
    }

    let installationId: string | null = null;

    try {
      if (
        Platform.OS === 'ios' &&
        typeof (Application as any).getIosIdForVendorAsync === 'function'
      ) {
        installationId = await Application.getIosIdForVendorAsync();
      } else if (Platform.OS === 'android') {
        const androidId = (Application as any).androidId as string | null;
        if (androidId) {
          installationId = androidId;
        }
      }
    } catch (error) {
      Logger.warn(
        'Failed to obtain device-provided installation identifier',
        error,
        '🔔 NotificationService'
      );
    }

    if (!installationId) {
      installationId = await this.getStoredInstallationId();
    }

    if (!installationId) {
      installationId = this.generateInstallationId();
    }

    await this.persistInstallationId(installationId);
    this.installationId = installationId;
    return installationId;
  }

  /**
   * Configure notification handler for foreground notifications
   */
  public configureNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });
  }

  /**
   * Request permissions for push notifications
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        Logger.warn('Notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Logger.warn('Failed to get push notification permissions');
        return false;
      }

      return true;
    } catch (error) {
      Logger.error('Error requesting push notification permissions:', error);
      return false;
    }
  }

  /**
   * Get Expo Push Token (internal use only)
   */
  private async getExpoPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        Logger.warn('Expo Push tokens only work on physical devices');
        return null;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId) {
        throw new Error('Project ID not found in app config');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId
      });
      this.currentExpoPushToken = tokenData.data;

      Logger.info('Expo Push Token obtained:', this.currentExpoPushToken);

      return this.currentExpoPushToken;
    } catch (error) {
      Logger.error('Error getting Expo push token:', error);
      return null;
    }
  }

  /**
   * Get Native Device Push Token (FCM for Android, APNs for iOS) (internal use only)
   */
  private async getDevicePushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const tokenData = await Notifications.getDevicePushTokenAsync();
      return tokenData?.data as string | null;
    } catch (error) {
      Logger.error('Error getting device push token:', error);
      return null;
    }
  }

  /**
   * Register user for push notifications
   */
  public async registerForPushNotifications(
    userId: string
  ): Promise<string | null> {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Setup Android notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidNotificationChannel();
      }

      // Get tokens
      const expoPushToken = await this.getExpoPushToken();
      const devicePushToken = await this.getDevicePushToken();

      if (!expoPushToken && !devicePushToken) {
        Logger.warn('No push tokens obtained');
        return null;
      }

      // Save to Firestore
      await this.savePushToken(userId, expoPushToken, devicePushToken);

      return expoPushToken || devicePushToken || null;
    } catch (error) {
      Logger.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to Firestore
   */
  private async savePushToken(
    userId: string,
    expoPushToken: string | null,
    devicePushToken: string | null
  ): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      if (user.uid !== userId) {
        throw new Error('Attempting to save push token for different user');
      }

      const installationId = await this.ensureInstallationId();
      const tokensRef = doc(db, 'pushTokens', installationId);

      await setDoc(
        tokensRef,
        {
          userId,
          installationId,
          expoPushToken: expoPushToken || null,
          devicePushToken: devicePushToken || null,
          platform: Platform.OS as 'ios' | 'android' | 'web',
          lastUpdated: serverTimestamp()
        },
        { merge: true }
      );

      Logger.info('Push token saved successfully');
    } catch (error) {
      Logger.error('Error saving push token:', error);
      throw error;
    }
  }

  /**
   * Setup Android notification channel
   */
  private async setupAndroidNotificationChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const channelId = 'deezeroom_notifications';
      const existingChannels =
        await Notifications.getNotificationChannelsAsync();
      const channelExists = existingChannels?.some(
        (channel) => channel.id === channelId
      );

      if (!channelExists) {
        await Notifications.setNotificationChannelAsync(channelId, {
          name: 'DEEZERoom Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#a238ff',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          sound: 'default'
        });

        Logger.info('Android notification channel created');
      }
    } catch (error) {
      Logger.error('Error setting up Android notification channel:', error);
    }
  }

  /**
   * Get badge count
   */
  public async getBadgeCount(): Promise<number> {
    try {
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          const title = document.title || '';
          const match = title.match(/^\((\d+)\)\s*/);
          return match ? parseInt(match[1], 10) : 0;
        }
        return 0;
      }
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      Logger.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  public async setBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          if (this.baseWebTitle == null) {
            this.baseWebTitle = document.title || '';
          }
          const base = (this.baseWebTitle || '').replace(/^\(\d+\)\s*/, '');
          const nextTitle = count > 0 ? `(${count}) ${base}` : base;
          document.title = nextTitle;
        }
        return;
      }
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      Logger.error('Error setting badge count:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();

export const getUserPushTokens = async (
  userId: string
): Promise<PushTokenDocument[]> => {
  try {
    const tokensQuery = query(
      collection(db, 'pushTokens'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(tokensQuery);
    return snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as PushTokenDocument;
        return {
          ...data,
          installationId: data.installationId ?? docSnap.id
        };
      })
      .filter(
        (token) =>
          Boolean(token.expoPushToken) || Boolean(token.devicePushToken)
      );
  } catch (error) {
    Logger.warn(
      'Failed to load user push tokens',
      error,
      '🔔 NotificationService'
    );
    return [];
  }
};

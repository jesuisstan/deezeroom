import { Platform } from 'react-native';

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Logger } from '@/modules/logger';
import { auth, db } from '@/utils/firebase/firebase-init';

export interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance: Notifications.AndroidImportance;
  enableVibrate: boolean;
  enableLights: boolean;
  lightColor?: string;
}

export interface PushToken {
  expoPushToken?: string;
  devicePushToken?: string;
  platform: 'ios' | 'android' | 'web';
  lastUpdated: Date;
}

class NotificationService {
  private static instance: NotificationService;
  private currentExpoPushToken: string | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Configure notification handler for foreground notifications
   */
  public configureNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
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
   * Get Expo Push Token
   */
  public async getExpoPushToken(): Promise<string | null> {
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
   * Get Native Device Push Token (FCM for Android, APNs for iOS)
   */
  public async getDevicePushToken(): Promise<string | null> {
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

      const tokensRef = doc(db, 'users', userId);
      const tokensData: PushToken = {
        expoPushToken: expoPushToken || undefined,
        devicePushToken: devicePushToken || undefined,
        platform: Platform.OS as 'ios' | 'android' | 'web',
        lastUpdated: new Date()
      };

      await setDoc(tokensRef, { pushTokens: tokensData }, { merge: true });

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
   * Get user's push token from Firestore
   */
  public async getUserPushToken(userId: string): Promise<PushToken | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      return userData.pushTokens || null;
    } catch (error) {
      Logger.error('Error getting user push token:', error);
      return null;
    }
  }

  /**
   * Get all push tokens for multiple users
   */
  public async getUserPushTokens(
    userIds: string[]
  ): Promise<{ userId: string; token: PushToken }[]> {
    try {
      const results: { userId: string; token: PushToken }[] = [];

      for (const userId of userIds) {
        const token = await this.getUserPushToken(userId);
        if (token) {
          results.push({ userId, token });
        }
      }

      return results;
    } catch (error) {
      Logger.error('Error getting user push tokens:', error);
      return [];
    }
  }

  /**
   * Schedule a local notification
   */
  public async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    seconds: number = 0
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH
        },
        trigger:
          seconds > 0
            ? {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds
              }
            : null
      });

      return identifier;
    } catch (error) {
      Logger.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Logger.info('All notifications cancelled');
    } catch (error) {
      Logger.error('Error cancelling notifications:', error);
    }
  }

  /**
   * Cancel a specific notification
   */
  public async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      Logger.error('Error cancelling notification:', error);
    }
  }

  /**
   * Get badge count
   */
  public async getBadgeCount(): Promise<number> {
    try {
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
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      Logger.error('Error setting badge count:', error);
    }
  }

  /**
   * Dismiss all presented notifications
   */
  public async dismissAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      Logger.error('Error dismissing notifications:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();

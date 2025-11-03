import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { Logger } from '@/modules/logger';
import { useUser } from '@/providers/UserProvider';
import { notificationService } from '@/utils/firebase/firebase-service-notifications';
import { PlaylistService } from '@/utils/firebase/firebase-service-playlists';

interface NotificationsContextType {
  expoPushToken: string | null;
  lastNotification: Notifications.Notification | null;
  badgeCount: number;
  isRegistered: boolean;
  registerForPushNotifications: () => Promise<void>;
  clearBadge: () => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

interface NotificationsProviderProps {
  children: React.ReactNode;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({
  children
}) => {
  const router = useRouter();
  const { user } = useUser();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [lastNotification, setLastNotification] =
    useState<Notifications.Notification | null>(null);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Configure notification handler
  useEffect(() => {
    notificationService.configureNotificationHandler();
  }, []);

  // Register user for push notifications
  const registerForPushNotifications = async () => {
    try {
      if (!user) {
        Logger.warn(
          'Cannot register for push notifications: user not authenticated'
        );
        return;
      }

      const token = await notificationService.registerForPushNotifications(
        user.uid
      );

      if (token) {
        setExpoPushToken(token);
        setIsRegistered(true);
        Logger.info('Successfully registered for push notifications');
      }
    } catch (error) {
      Logger.error('Error registering for push notifications:', error);
    }
  };

  // Clear badge count - resets both UI badge and native badge
  const clearBadge = async () => {
    try {
      setBadgeCount(0);
      await notificationService.setBadgeCount(0);
    } catch (error) {
      Logger.error('Error clearing badge:', error);
    }
  };

  // Register user when authenticated
  useEffect(() => {
    if (user && !isRegistered) {
      registerForPushNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isRegistered]);

  // Setup notification listeners
  useEffect(() => {
    // Listener for notifications received in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setLastNotification(notification);
        Logger.info('Notification received:', notification);
      });

    // Listener for when user taps on notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        Logger.info('Notification response:', response);

        // Handle navigation based on notification type
        if (data?.type === 'invitation') {
          router.push('/notifications');
        } else if (data?.type === 'playlist') {
          if (data.playlistId) {
            router.push(`/playlist/${data.playlistId}` as any);
          }
        } else if (data?.type === 'event') {
          if (data.eventId) {
            router.push(`/events/${data.eventId}` as any);
          }
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  // Real-time badge count updates
  useEffect(() => {
    if (!user) return;

    let unsubscribeInvitations: (() => void) | undefined;
    let unsubscribeResponses: (() => void) | undefined;

    let currentInvitations: any[] = [];
    let currentResponses: any[] = [];

    const calculateBadgeCount = async () => {
      try {
        // Get viewed response IDs from storage
        const key = `viewed_responses_${user.uid}`;
        const viewedIdsJson = await AsyncStorage.getItem(key);
        const viewedIds = viewedIdsJson
          ? (JSON.parse(viewedIdsJson) as string[])
          : [];

        // Filter out viewed responses
        const unviewedResponses = currentResponses.filter(
          (inv) => !viewedIds.includes(inv.id)
        );

        // Calculate total unread count
        let unreadCount = currentInvitations.length;
        unreadCount += unviewedResponses.length;

        setBadgeCount(unreadCount);

        // Update native badge
        await notificationService.setBadgeCount(unreadCount);
      } catch (error) {
        Logger.error('Error calculating badge count:', error);
      }
    };

    // Subscribe to incoming invitations (real-time)
    unsubscribeInvitations = PlaylistService.subscribeToUserInvitations(
      user.uid,
      (invitations) => {
        currentInvitations = invitations;
        calculateBadgeCount();
      }
    );

    // Subscribe to sent invitations responses (real-time)
    unsubscribeResponses =
      PlaylistService.subscribeToUserSentInvitationsResponses(
        user.uid,
        (responses) => {
          currentResponses = responses;
          calculateBadgeCount();
        }
      );

    return () => {
      if (unsubscribeInvitations) {
        unsubscribeInvitations();
      }
      if (unsubscribeResponses) {
        unsubscribeResponses();
      }
    };
  }, [user]);

  // Reset badge when user opens notifications screen
  useEffect(() => {
    if (Platform.OS !== 'web' && badgeCount > 0) {
      notificationService.setBadgeCount(badgeCount);
    }
  }, [badgeCount]);

  const value: NotificationsContextType = {
    expoPushToken,
    lastNotification,
    badgeCount,
    isRegistered,
    registerForPushNotifications,
    clearBadge
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within NotificationsProvider'
    );
  }
  return context;
};

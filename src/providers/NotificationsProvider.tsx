import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { Platform } from 'react-native';

import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { Logger } from '@/modules/logger';
import { useUser } from '@/providers/UserProvider';
import { notificationService } from '@/utils/firebase/firebase-service-notifications';

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

  // Clear badge count
  const clearBadge = async () => {
    try {
      await notificationService.setBadgeCount(0);
      setBadgeCount(0);
    } catch (error) {
      Logger.error('Error clearing badge:', error);
    }
  };

  // Register user when authenticated
  useEffect(() => {
    if (user && !isRegistered) {
      registerForPushNotifications();
    }
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

  // Update badge count periodically
  useEffect(() => {
    const updateBadgeCount = async () => {
      try {
        const count = await notificationService.getBadgeCount();
        setBadgeCount(count);
      } catch (error) {
        Logger.error('Error updating badge count:', error);
      }
    };

    updateBadgeCount();
    const interval = setInterval(updateBadgeCount, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Update badge when user views notifications
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const currentBadge = badgeCount;
      if (currentBadge > 0) {
        notificationService.setBadgeCount(currentBadge);
      }
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

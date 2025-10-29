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

  // Update badge count based on all pending notifications (invitations, responses, etc.)
  useEffect(() => {
    const updateNotificationsCount = async () => {
      if (!user) return;

      try {
        // Get all pending invitations for the user (playlist invitations they received)
        const invitations = await PlaylistService.getUserInvitations(user.uid);

        // Get all invitations that user sent (to track responses)
        const sentInvitationsResponses =
          await PlaylistService.getUserSentInvitationsResponses(user.uid);

        // Calculate total unread count
        let unreadCount = invitations.length;
        unreadCount += sentInvitationsResponses.length;

        setBadgeCount(unreadCount);

        // Update native badge
        await notificationService.setBadgeCount(unreadCount);
      } catch (error) {
        Logger.error('Error updating notifications count:', error);
      }
    };

    updateNotificationsCount();

    // Update every 10 seconds
    const interval = setInterval(updateNotificationsCount, 10000);

    return () => clearInterval(interval);
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

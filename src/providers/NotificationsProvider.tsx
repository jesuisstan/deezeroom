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

import { Logger } from '@/components/modules/logger';
import { useUser } from '@/providers/UserProvider';
import {
  ConnectionWithId,
  subscribeToPendingConnections
} from '@/utils/firebase/firebase-service-connections';
import { notificationService } from '@/utils/firebase/firebase-service-notifications';
import {
  PlaylistInvitation,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';

interface NotificationsContextType {
  expoPushToken: string | null;
  badgeCount: number;
  isRegistered: boolean;
  registerForPushNotifications: () => Promise<void>;
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
  const { user } = useUser();
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [playlistInvitations, setPlaylistInvitations] = useState<
    PlaylistInvitation[]
  >([]);
  const [friendRequests, setFriendRequests] = useState<ConnectionWithId[]>([]);
  const notificationResponseListener = useRef<ReturnType<
    typeof Notifications.addNotificationResponseReceivedListener
  > | null>(null);

  // TODO Implement FRIENDS REQUESTS
  // TODO Implement EVENTS INVITATIONS

  // Configure notification handler
  useEffect(() => {
    notificationService.configureNotificationHandler();
  }, []);

  // Navigate to notifications screen when user taps a notification
  useEffect(() => {
    if (!user) {
      return;
    }

    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener(() => {
        Logger.info('Notification tapped, navigating to notifications screen');
        router.push('/notifications');
      });

    return () => {
      notificationResponseListener.current?.remove();
      notificationResponseListener.current = null;
    };
  }, [router, user]);

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

  // Register user when authenticated
  useEffect(() => {
    if (user && !isRegistered) {
      registerForPushNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isRegistered]);

  // Subscribe to incoming playlist invitations
  useEffect(() => {
    if (!user) {
      setPlaylistInvitations([]);
      setFriendRequests([]);
      return;
    }

    const unsubscribe = PlaylistService.subscribeToUserInvitations(
      user.uid,
      (newInvitations) => {
        setPlaylistInvitations(newInvitations);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Subscribe to incoming friend requests
  useEffect(() => {
    if (!user) {
      setFriendRequests([]);
      return;
    }

    const unsubscribe = subscribeToPendingConnections(
      user.uid,
      (connections) => {
        const incoming = connections.filter(
          (connection) =>
            connection.requestedBy && connection.requestedBy !== user.uid
        );
        setFriendRequests(incoming);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Recalculate badge count based on playlist invitations
  useEffect(() => {
    if (!user) {
      setBadgeCount(0);
      notificationService
        .setBadgeCount(0)
        .catch((error) =>
          Logger.error('Error updating native badge count:', error)
        );
      return;
    }

    const unread = playlistInvitations.length + friendRequests.length;

    setBadgeCount(unread);

    if (Platform.OS !== 'web') {
      notificationService
        .setBadgeCount(unread)
        .catch((error) =>
          Logger.error('Error updating native badge count:', error)
        );
    }
  }, [playlistInvitations, friendRequests, user]);

  const value: NotificationsContextType = {
    expoPushToken,
    badgeCount,
    isRegistered,
    registerForPushNotifications
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

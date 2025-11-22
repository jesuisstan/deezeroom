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

import { useOwnershipTransfers } from '@/hooks/useOwnershipTransfers';
import { Logger } from '@/modules/logger';
import { useUser } from '@/providers/UserProvider';
import {
  ConnectionWithId,
  subscribeToPendingConnections
} from '@/utils/firebase/firebase-service-connections';
import {
  EventInvitation,
  EventService
} from '@/utils/firebase/firebase-service-events';
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
  const [eventInvitations, setEventInvitations] = useState<EventInvitation[]>(
    []
  );
  const [friendRequests, setFriendRequests] = useState<ConnectionWithId[]>([]);
  const { ownershipTransfers } = useOwnershipTransfers();
  const previousUserIdRef = useRef<string | null>(null);
  const notificationResponseListener = useRef<ReturnType<
    typeof Notifications.addNotificationResponseReceivedListener
  > | null>(null);

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

  // Reset registration state when user changes or logs out
  useEffect(() => {
    const currentUserId = user?.uid ?? null;
    const previousUserId = previousUserIdRef.current;

    if (previousUserId && previousUserId !== currentUserId) {
      setIsRegistered(false);
      setExpoPushToken(null);
      setPlaylistInvitations([]);
      setEventInvitations([]);
      setFriendRequests([]);
    }

    if (!currentUserId) {
      setIsRegistered(false);
      setExpoPushToken(null);
      setPlaylistInvitations([]);
      setEventInvitations([]);
      setFriendRequests([]);
    }

    previousUserIdRef.current = currentUserId;
  }, [user?.uid]);

  // Subscribe to incoming playlist invitations
  useEffect(() => {
    if (!user) {
      setPlaylistInvitations([]);
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

  // Subscribe to incoming event invitations
  useEffect(() => {
    if (!user) {
      setEventInvitations([]);
      return;
    }

    const unsubscribe = EventService.subscribeToUserEventInvitations(
      user.uid,
      (newInvitations) => {
        setEventInvitations(newInvitations);
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

  // Recalculate badge count based on all invitations
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

    const unread =
      playlistInvitations.length +
      eventInvitations.length +
      friendRequests.length +
      ownershipTransfers.length;

    setBadgeCount(unread);

    if (Platform.OS !== 'web') {
      notificationService
        .setBadgeCount(unread)
        .catch((error) =>
          Logger.error('Error updating native badge count:', error)
        );
    }
  }, [
    playlistInvitations,
    eventInvitations,
    friendRequests,
    ownershipTransfers,
    user
  ]);

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

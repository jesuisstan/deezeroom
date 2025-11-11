import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Logger } from '@/components/modules/logger';
import { useUser } from '@/providers/UserProvider';
import {
  acceptFriendship,
  ConnectionWithId,
  listPendingConnectionsFor,
  rejectFriendship,
  subscribeToPendingConnections
} from '@/utils/firebase/firebase-service-connections';
import { getPublicProfileDoc } from '@/utils/firebase/firebase-service-profiles';
import { UserService } from '@/utils/firebase/firebase-service-user';
import { parseFirestoreDate } from '@/utils/firebase/firestore-date-utils';

export interface FriendRequestItem {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterPhotoURL?: string;
  requesterEmail?: string;
  requestedAt?: Date;
  connection: ConnectionWithId;
}

interface UseFriendRequestsReturn {
  friendRequests: FriendRequestItem[];
  isLoading: boolean;
  refreshFriendRequests: () => Promise<void>;
  acceptFriendRequest: (
    request: FriendRequestItem
  ) => Promise<{ success: boolean; message?: string }>;
  declineFriendRequest: (
    request: FriendRequestItem
  ) => Promise<{ success: boolean; message?: string }>;
}

const buildFriendRequestItems = async (
  connections: ConnectionWithId[],
  currentUserId: string,
  cache: Map<string, { name: string; photoURL?: string; email?: string }>
): Promise<FriendRequestItem[]> => {
  const incoming = connections.filter(
    (connection) =>
      connection.requestedBy &&
      connection.requestedBy !== currentUserId &&
      (connection.userA === currentUserId || connection.userB === currentUserId)
  );

  const items = await Promise.all(
    incoming.map(async (connection) => {
      const otherUserId =
        connection.userA === currentUserId
          ? connection.userB
          : connection.userA;

      if (!otherUserId) {
        return {
          id: connection.id,
          requesterId: connection.requestedBy as string,
          requesterName: 'Someone',
          connection,
          requestedAt: parseFirestoreDate(connection.createdAt)
        };
      }

      if (!cache.has(otherUserId)) {
        const [publicProfileResult, userProfileResult] =
          await Promise.allSettled([
            getPublicProfileDoc(otherUserId),
            UserService.getUserProfile(otherUserId)
          ]);

        const publicProfile =
          publicProfileResult.status === 'fulfilled'
            ? publicProfileResult.value
            : null;

        if (publicProfileResult.status === 'rejected') {
          Logger.warn(
            'Failed to load public profile for friend request',
            publicProfileResult.reason,
            '🤝 FriendRequests'
          );
        }

        const userProfile =
          userProfileResult.status === 'fulfilled'
            ? userProfileResult.value
            : null;

        if (userProfileResult.status === 'rejected') {
          const reason = userProfileResult.reason as Error;
          // Suppress permission-denied noise; log other cases
          if ((reason as any)?.code !== 'permission-denied') {
            Logger.warn(
              'Failed to load private profile for friend request',
              reason,
              '🤝 FriendRequests'
            );
          }
        }

        const name =
          publicProfile?.displayName ||
          userProfile?.displayName ||
          userProfile?.email?.split?.('@')?.[0] ||
          'Someone';

        cache.set(otherUserId, {
          name,
          photoURL: publicProfile?.photoURL || userProfile?.photoURL,
          email: userProfile?.email
        });
      }

      const cached = cache.get(otherUserId) ?? { name: 'Someone' };

      return {
        id: connection.id,
        requesterId: connection.requestedBy as string,
        requesterName: cached.name,
        requesterPhotoURL: cached.photoURL,
        requesterEmail: cached.email,
        requestedAt: parseFirestoreDate(connection.createdAt),
        connection
      };
    })
  );

  return items.sort((a, b) => {
    const timeA = a.requestedAt?.getTime() ?? 0;
    const timeB = b.requestedAt?.getTime() ?? 0;
    return timeB - timeA;
  });
};

export const useFriendRequests = (): UseFriendRequestsReturn => {
  const { user } = useUser();
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const profileCache = useRef<
    Map<string, { name: string; photoURL?: string; email?: string }>
  >(new Map());

  useEffect(() => {
    profileCache.current.clear();
  }, [user?.uid]);

  const resolveConnections = useCallback(
    async (connections: ConnectionWithId[]) => {
      if (!user?.uid) {
        setFriendRequests([]);
        return;
      }

      try {
        const items = await buildFriendRequestItems(
          connections,
          user.uid,
          profileCache.current
        );
        setFriendRequests(items);
      } catch (error) {
        Logger.error('Error resolving friend requests', error);
        setFriendRequests([]);
      }
    },
    [user?.uid]
  );

  useEffect(() => {
    if (!user?.uid) {
      setFriendRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isActive = true;

    const unsubscribe = subscribeToPendingConnections(
      user.uid,
      (connections) => {
        if (!isActive) return;
        resolveConnections(connections).finally(() => {
          if (isActive) setIsLoading(false);
        });
      }
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [user?.uid, resolveConnections]);

  const refreshFriendRequests = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const connections = await listPendingConnectionsFor(user.uid);
      await resolveConnections(connections);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, resolveConnections]);

  const acceptFriendRequest = useCallback(
    async (request: FriendRequestItem) => {
      if (!user?.uid) {
        return { success: false, message: 'User not authenticated' };
      }

      try {
        return await acceptFriendship(user.uid, request.requesterId, user.uid);
      } catch (error) {
        Logger.error('Error accepting friend request:', error);
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to accept friend request'
        };
      }
    },
    [user?.uid]
  );

  const declineFriendRequest = useCallback(
    async (request: FriendRequestItem) => {
      if (!user?.uid) {
        return { success: false, message: 'User not authenticated' };
      }

      try {
        return await rejectFriendship(user.uid, request.requesterId, user.uid);
      } catch (error) {
        Logger.error('Error declining friend request:', error);
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to decline friend request'
        };
      }
    },
    [user?.uid]
  );

  return useMemo(
    () => ({
      friendRequests,
      isLoading,
      refreshFriendRequests,
      acceptFriendRequest,
      declineFriendRequest
    }),
    [
      friendRequests,
      isLoading,
      refreshFriendRequests,
      acceptFriendRequest,
      declineFriendRequest
    ]
  );
};

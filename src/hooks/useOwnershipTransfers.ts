import { useCallback, useEffect, useState } from 'react';

import { Logger } from '@/components/modules/logger';
import { useUser } from '@/providers/UserProvider';
import {
  OwnershipTransferNotification,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';

export interface UseOwnershipTransfersReturn {
  ownershipTransfers: OwnershipTransferNotification[];
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
}

export const useOwnershipTransfers = (): UseOwnershipTransfersReturn => {
  const { user } = useUser();
  const [ownershipTransfers, setOwnershipTransfers] = useState<
    OwnershipTransferNotification[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to ownership transfers from Firestore
  useEffect(() => {
    if (!user) {
      setOwnershipTransfers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = PlaylistService.subscribeToUserOwnershipTransfers(
      user.uid,
      (transfers) => {
        setOwnershipTransfers(transfers);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Mark notification as read (delete it)
  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        await PlaylistService.deleteOwnershipTransfer(user.uid, id);
      } catch (error) {
        Logger.error('Error marking ownership transfer as read:', error);
        throw error;
      }
    },
    [user]
  );

  // Remove notification (same as markAsRead)
  const removeNotification = useCallback(
    async (id: string) => {
      await markAsRead(id);
    },
    [markAsRead]
  );

  return {
    ownershipTransfers,
    isLoading,
    markAsRead,
    removeNotification
  };
};

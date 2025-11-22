import { useCallback, useEffect, useState } from 'react';

import { Logger } from '@/modules/logger';
import { useUser } from '@/providers/UserProvider';
import {
  PlaylistInvitation,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';

export interface UsePlaylistInvitationsReturn {
  playlistInvitations: PlaylistInvitation[];
  unreadCount: number;
  isLoading: boolean;
  refreshInvitations: () => Promise<void>;
  acceptInvitation: (invitation: PlaylistInvitation) => Promise<{
    success: boolean;
    message?: string;
  }>;
  declineInvitation: (invitation: PlaylistInvitation) => Promise<{
    success: boolean;
    message?: string;
  }>;
}

export const usePlaylistInvitations = (): UsePlaylistInvitationsReturn => {
  const { user, profile } = useUser();
  const [playlistInvitations, setPlaylistInvitations] = useState<
    PlaylistInvitation[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time subscription to user invitations
  useEffect(() => {
    if (!user) {
      setPlaylistInvitations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = PlaylistService.subscribeToUserInvitations(
      user.uid,
      (newInvitations) => {
        setPlaylistInvitations(newInvitations);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  // Refresh invitations manually (for pull-to-refresh)
  const refreshInvitations = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const userInvitations = await PlaylistService.getUserInvitations(
        user.uid
      );
      setPlaylistInvitations(userInvitations);
    } catch (error) {
      Logger.error('Error refreshing invitations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Calculate unread count based on last read time
  useEffect(() => {
    setUnreadCount(playlistInvitations.length);
  }, [playlistInvitations]);

  // Accept invitation
  const acceptInvitation = useCallback(
    async (invitation: PlaylistInvitation) => {
      if (!user || !profile) {
        return { success: false, message: 'User not authenticated' };
      }

      try {
        const result = await PlaylistService.acceptInvitation(
          invitation.playlistId,
          invitation.id,
          user.uid
        );

        // Invitations will be updated automatically via real-time subscription
        return result;
      } catch (error) {
        Logger.error('Error accepting invitation:', error);
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to accept invitation'
        };
      }
    },
    [user, profile]
  );

  // Decline invitation
  const declineInvitation = useCallback(
    async (invitation: PlaylistInvitation) => {
      if (!user) {
        return { success: false, message: 'User not authenticated' };
      }

      try {
        const result = await PlaylistService.declineInvitation(
          invitation.playlistId,
          invitation.id,
          user.uid
        );

        // Invitations will be updated automatically via real-time subscription
        return result;
      } catch (error) {
        Logger.error('Error declining invitation:', error);
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to decline invitation'
        };
      }
    },
    [user]
  );

  return {
    playlistInvitations,
    unreadCount,
    isLoading,
    refreshInvitations,
    acceptInvitation,
    declineInvitation
  };
};

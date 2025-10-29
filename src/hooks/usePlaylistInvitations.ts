import { useCallback, useEffect, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Logger } from '@/modules/logger';
import { useUser } from '@/providers/UserProvider';
import {
  PlaylistInvitation,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';
import { parseFirestoreDate } from '@/utils/firebase/firestore-date-utils';

export interface UsePlaylistInvitationsReturn {
  invitations: PlaylistInvitation[];
  unreadCount: number;
  isLoading: boolean;
  refreshInvitations: () => Promise<void>;
  markAsRead: () => void;
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
  const [invitations, setInvitations] = useState<PlaylistInvitation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastReadTime, setLastReadTime] = useState<Date | null>(null);

  // Load last read time from storage
  useEffect(() => {
    const loadLastReadTime = async () => {
      if (!user) return;

      try {
        const key = `notifications_last_read_${user.uid}`;
        const oldKey = 'notifications_last_read'; // Old key without user ID

        let storedTime = await AsyncStorage.getItem(key);

        // If no user-specific data found, check old key
        if (!storedTime) {
          const oldStoredTime = await AsyncStorage.getItem(oldKey);
          if (oldStoredTime) {
            // Migrate old data to new user-specific key
            await AsyncStorage.setItem(key, oldStoredTime);
            await AsyncStorage.removeItem(oldKey);
            storedTime = oldStoredTime;
          }
        }

        if (storedTime) {
          setLastReadTime(new Date(storedTime));
        }
      } catch (error) {
        Logger.error('Error loading last read time:', error);
      }
    };
    loadLastReadTime();
  }, [user]);

  // Calculate unread count based on last read time
  useEffect(() => {
    if (!lastReadTime) {
      setUnreadCount(invitations.length);
      return;
    }

    const unread = invitations.filter((invitation) => {
      const invitedAt = parseFirestoreDate(invitation.invitedAt);
      return invitedAt > lastReadTime;
    }).length;

    setUnreadCount(unread);
  }, [invitations, lastReadTime]);

  // Real-time subscription to user invitations
  useEffect(() => {
    if (!user) {
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = PlaylistService.subscribeToUserInvitations(
      user.uid,
      (newInvitations) => {
        setInvitations(newInvitations);
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
      setInvitations(userInvitations);
    } catch (error) {
      Logger.error('Error refreshing invitations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark notifications as read
  const markAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const now = new Date();
      const key = `notifications_last_read_${user.uid}`;
      await AsyncStorage.setItem(key, now.toISOString());
      setLastReadTime(now);
      setUnreadCount(0);
    } catch (error) {
      Logger.error('Error marking notifications as read:', error);
    }
  }, [user]);

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
          user.uid,
          'editor', // role
          {
            displayName: profile.displayName,
            email: profile.email,
            photoURL: profile.photoURL
          }
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
    invitations,
    unreadCount,
    isLoading,
    refreshInvitations,
    markAsRead,
    acceptInvitation,
    declineInvitation
  };
};

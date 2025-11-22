import { useCallback, useEffect, useState } from 'react';

import { Logger } from '@/modules/logger';
import { useUser } from '@/providers/UserProvider';
import {
  EventInvitation,
  EventService
} from '@/utils/firebase/firebase-service-events';

export interface UseEventInvitationsReturn {
  eventInvitations: EventInvitation[];
  unreadCount: number;
  isLoading: boolean;
  refreshInvitations: () => Promise<void>;
  acceptInvitation: (invitation: EventInvitation) => Promise<{
    success: boolean;
    message?: string;
  }>;
  declineInvitation: (invitation: EventInvitation) => Promise<{
    success: boolean;
    message?: string;
  }>;
}

export const useEventInvitations = (): UseEventInvitationsReturn => {
  const { user } = useUser();
  const [eventInvitations, setEventInvitations] = useState<EventInvitation[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time subscription to user invitations
  useEffect(() => {
    if (!user) {
      setEventInvitations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = EventService.subscribeToUserEventInvitations(
      user.uid,
      (newInvitations) => {
        setEventInvitations(newInvitations);
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
      const userInvitations = await EventService.getUserEventInvitations(
        user.uid
      );
      setEventInvitations(userInvitations);
    } catch (error) {
      Logger.error('Error refreshing event invitations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Calculate unread count
  useEffect(() => {
    setUnreadCount(eventInvitations.length);
  }, [eventInvitations]);

  // Accept invitation
  const acceptInvitation = useCallback(
    async (invitation: EventInvitation) => {
      if (!user) {
        return { success: false, message: 'User not authenticated' };
      }

      try {
        await EventService.acceptInvitation(
          invitation.eventId,
          invitation.id,
          user.uid
        );

        // Invitations will be updated automatically via real-time subscription
        return { success: true };
      } catch (error) {
        Logger.error('Error accepting event invitation:', error);
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to accept invitation'
        };
      }
    },
    [user]
  );

  // Decline invitation
  const declineInvitation = useCallback(
    async (invitation: EventInvitation) => {
      if (!user) {
        return { success: false, message: 'User not authenticated' };
      }

      try {
        await EventService.declineInvitation(
          invitation.eventId,
          invitation.id,
          user.uid
        );

        // Invitations will be updated automatically via real-time subscription
        return { success: true };
      } catch (error) {
        Logger.error('Error declining event invitation:', error);
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
    eventInvitations,
    unreadCount,
    isLoading,
    refreshInvitations,
    acceptInvitation,
    declineInvitation
  };
};

import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import { EventInvitationCard } from '@/components/notifications/EventInvitationCard';
import OwnershipTransferCard from '@/components/notifications/OwnershipTransferCard';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import {
  type FriendRequestItem,
  useFriendRequests
} from '@/hooks/useFriendRequests';
import { useOwnershipTransfers } from '@/hooks/useOwnershipTransfers';
import { usePlaylistInvitations } from '@/hooks/usePlaylistInvitations';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import { usePressAnimation } from '@/style/usePressAnimation';
import { EventInvitation } from '@/utils/firebase/firebase-service-events';
import { PlaylistInvitation } from '@/utils/firebase/firebase-service-playlists';
import { parseFirestoreDate } from '@/utils/firebase/firestore-date-utils';

const NotificationsScreen = () => {
  const { theme } = useTheme();
  const { profile } = useUser();
  const { animatedStyle } = usePressAnimation({
    appearAnimation: true,
    appearDelay: 0,
    appearDuration: 800
  });
  const {
    playlistInvitations,
    isLoading: invitationsLoading,
    refreshInvitations,
    acceptInvitation,
    declineInvitation
  } = usePlaylistInvitations();
  const {
    eventInvitations,
    isLoading: eventInvitationsLoading,
    refreshInvitations: refreshEventInvitations,
    acceptInvitation: acceptEventInvitation,
    declineInvitation: declineEventInvitation
  } = useEventInvitations();
  const {
    friendRequests,
    isLoading: friendRequestsLoading,
    refreshFriendRequests,
    acceptFriendRequest,
    declineFriendRequest
  } = useFriendRequests();
  const {
    ownershipTransfers,
    isLoading: ownershipTransfersLoading,
    markAsRead: markOwnershipTransferAsRead,
    removeNotification: removeOwnershipTransfer
  } = useOwnershipTransfers();

  const [processingPlaylistInvitations, setProcessingPlaylistInvitations] =
    useState<Set<string>>(new Set());
  const [processingEventInvitations, setProcessingEventInvitations] = useState<
    Set<string>
  >(new Set());
  const [processingFriendRequests, setProcessingFriendRequests] = useState<
    Set<string>
  >(new Set());
  const [processingOwnershipTransfers, setProcessingOwnershipTransfers] =
    useState<Set<string>>(new Set());

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      refreshInvitations(),
      refreshEventInvitations(),
      refreshFriendRequests()
    ]);
  };

  // Combine all notifications and sort by date (newest first)
  const allNotifications = useMemo(() => {
    const notifications: {
      id: string;
      type:
        | 'friend_request'
        | 'playlist_invitation'
        | 'event_invitation'
        | 'ownership_transfer';
      date: Date;
      data: FriendRequestItem | PlaylistInvitation | EventInvitation | any;
    }[] = [];

    // Add friend requests
    friendRequests.forEach((request) => {
      notifications.push({
        id: `friend_request_${request.id}`,
        type: 'friend_request',
        date: parseFirestoreDate(request.requestedAt || new Date()),
        data: request
      });
    });

    // Add playlist invitations
    playlistInvitations.forEach((invitation) => {
      notifications.push({
        id: `playlist_invitation_${invitation.id}`,
        type: 'playlist_invitation',
        date: parseFirestoreDate(invitation.invitedAt),
        data: invitation
      });
    });

    // Add event invitations
    eventInvitations.forEach((invitation) => {
      notifications.push({
        id: `event_invitation_${invitation.id}`,
        type: 'event_invitation',
        date: parseFirestoreDate(invitation.invitedAt),
        data: invitation
      });
    });

    // Add ownership transfers
    ownershipTransfers.forEach((transfer) => {
      notifications.push({
        id: `ownership_transfer_${transfer.id}`,
        type: 'ownership_transfer',
        date: transfer.receivedAt,
        data: transfer
      });
    });

    // Sort by date (newest first)
    return notifications.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [
    friendRequests,
    playlistInvitations,
    eventInvitations,
    ownershipTransfers
  ]);

  const handleAcceptPlaylistInvitation = async (
    invitation: PlaylistInvitation
  ) => {
    setProcessingPlaylistInvitations((prev) =>
      new Set(prev).add(invitation.id)
    );
    try {
      const result = await acceptInvitation(invitation);
      if (!result.success) {
        throw new Error(result.message || 'Failed to accept invitation');
      }
    } catch (error) {
      Logger.error('Error accepting invitation:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to accept invitation'
      });
    } finally {
      setProcessingPlaylistInvitations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const handleDeclinePlaylistInvitation = async (
    invitation: PlaylistInvitation
  ) => {
    setProcessingPlaylistInvitations((prev) =>
      new Set(prev).add(invitation.id)
    );
    try {
      const result = await declineInvitation(invitation);
      if (!result.success) {
        throw new Error(result.message || 'Failed to decline invitation');
      }
    } catch (error) {
      Logger.error('Error declining invitation:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to decline invitation'
      });
    } finally {
      setProcessingPlaylistInvitations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const isLoading =
    invitationsLoading ||
    eventInvitationsLoading ||
    friendRequestsLoading ||
    ownershipTransfersLoading;

  if (isLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (allNotifications.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: themeColors[theme]['bg-main'] }}
        contentContainerStyle={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center'
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[themeColors[theme]['primary']]}
            tintColor={themeColors[theme]['primary']}
          />
        }
      >
        <MaterialCommunityIcons
          name="bell-outline"
          size={64}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom
          type="bold"
          size="xl"
          className="mt-4 text-center"
          color={themeColors[theme]['text-main']}
        >
          No Notifications
        </TextCustom>
      </ScrollView>
    );
  }

  const handleAcceptFriendRequest = async (request: FriendRequestItem) => {
    setProcessingFriendRequests((prev) => new Set(prev).add(request.id));
    try {
      const result = await acceptFriendRequest(request);
      if (!result.success) {
        throw new Error(result.message || 'Failed to accept friend request');
      }
    } catch (error) {
      Logger.error('Error accepting friend request:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to accept friend request'
      });
    } finally {
      setProcessingFriendRequests((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleDeclineFriendRequest = async (request: FriendRequestItem) => {
    setProcessingFriendRequests((prev) => new Set(prev).add(request.id));
    try {
      const result = await declineFriendRequest(request);
      if (!result.success) {
        throw new Error(result.message || 'Failed to decline friend request');
      }
    } catch (error) {
      Logger.error('Error declining friend request:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to decline friend request'
      });
    } finally {
      setProcessingFriendRequests((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleAcceptEventInvitation = async (invitation: EventInvitation) => {
    setProcessingEventInvitations((prev) => new Set(prev).add(invitation.id));
    try {
      const result = await acceptEventInvitation(invitation);
      if (!result.success) {
        throw new Error(result.message || 'Failed to accept invitation');
      }
    } catch (error) {
      Logger.error('Error accepting event invitation:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to accept invitation'
      });
    } finally {
      setProcessingEventInvitations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const handleDeclineEventInvitation = async (invitation: EventInvitation) => {
    setProcessingEventInvitations((prev) => new Set(prev).add(invitation.id));
    try {
      const result = await declineEventInvitation(invitation);
      if (!result.success) {
        throw new Error(result.message || 'Failed to decline invitation');
      }
    } catch (error) {
      Logger.error('Error declining event invitation:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to decline invitation'
      });
    } finally {
      setProcessingEventInvitations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const handleMarkOwnershipTransferAsRead = async (id: string) => {
    setProcessingOwnershipTransfers((prev) => new Set(prev).add(id));
    try {
      await markOwnershipTransferAsRead(id);
    } catch (error) {
      Logger.error('Error marking ownership transfer as read:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark notification as read'
      });
    } finally {
      setProcessingOwnershipTransfers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleNavigateToPlaylists = async (playlistId: string, id: string) => {
    setProcessingOwnershipTransfers((prev) => new Set(prev).add(id));
    try {
      await removeOwnershipTransfer(id);
      router.push('/(tabs)/playlists');
    } catch (error) {
      Logger.error('Error navigating to playlists:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to navigate to playlists'
      });
    } finally {
      setProcessingOwnershipTransfers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const totalNew = allNotifications.length;

  return (
    <ScrollView
      className="flex-1 p-4"
      style={{ backgroundColor: themeColors[theme]['bg-main'] }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          colors={[themeColors[theme]['primary']]}
          tintColor={themeColors[theme]['primary']}
        />
      }
    >
      <View style={containerWidthStyle} className="gap-4">
        <View>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <TextCustom size="s" color={themeColors[theme]['text-main']}>
                {totalNew > 0
                  ? `${totalNew} notification${totalNew === 1 ? '' : 's'}`
                  : 'No notifications'}
              </TextCustom>
            </View>
          </View>
        </View>

        {allNotifications.map((notification) => {
          if (notification.type === 'friend_request') {
            const request = notification.data as FriendRequestItem;
            return (
              <Animated.View key={notification.id} style={animatedStyle}>
                <View className="gap-2 rounded-md border border-border bg-bg-secondary px-4 py-3">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="account-plus"
                      size={18}
                      color={themeColors[theme]['primary']}
                      style={{ marginRight: 8 }}
                    />
                    <TextCustom
                      type="semibold"
                      size="m"
                      color={themeColors[theme]['text-main']}
                    >
                      Friend Request
                    </TextCustom>
                  </View>

                  <TextCustom
                    size="s"
                    color={themeColors[theme]['text-secondary']}
                  >
                    <TextCustom
                      type="link"
                      size="s"
                      onPress={() =>
                        router.push(`/users/${request.requesterId}`)
                      }
                    >
                      {request.requesterName}
                    </TextCustom>{' '}
                    wants to connect with you.
                  </TextCustom>

                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <RippleButton
                        title="Accept"
                        size="sm"
                        loading={processingFriendRequests.has(request.id)}
                        disabled={processingFriendRequests.has(request.id)}
                        onPress={() => handleAcceptFriendRequest(request)}
                        width="full"
                      />
                    </View>
                    <View className="flex-1">
                      <RippleButton
                        title="Decline"
                        size="sm"
                        variant="outline"
                        loading={processingFriendRequests.has(request.id)}
                        disabled={processingFriendRequests.has(request.id)}
                        onPress={() => handleDeclineFriendRequest(request)}
                        width="full"
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          }

          if (notification.type === 'playlist_invitation') {
            const invitation = notification.data as PlaylistInvitation;
            return (
              <Animated.View key={notification.id} style={animatedStyle}>
                <View className="gap-2 rounded-md border border-border bg-bg-secondary px-4 py-3">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="playlist-music"
                      size={18}
                      color={themeColors[theme]['primary']}
                      style={{ marginRight: 8 }}
                    />
                    <TextCustom
                      type="semibold"
                      size="m"
                      color={themeColors[theme]['text-main']}
                    >
                      Playlist Invitation
                    </TextCustom>
                  </View>

                  <TextCustom
                    size="s"
                    color={themeColors[theme]['text-secondary']}
                  >
                    {`You've been invited to collaborate on ${invitation.playlistName ? `"${invitation.playlistName}"` : 'a'} playlist.`}
                  </TextCustom>

                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <RippleButton
                        title="Accept"
                        size="sm"
                        loading={processingPlaylistInvitations.has(
                          invitation.id
                        )}
                        disabled={processingPlaylistInvitations.has(
                          invitation.id
                        )}
                        onPress={() =>
                          handleAcceptPlaylistInvitation(invitation)
                        }
                        width="full"
                      />
                    </View>
                    <View className="flex-1">
                      <RippleButton
                        title="Decline"
                        size="sm"
                        variant="outline"
                        loading={processingPlaylistInvitations.has(
                          invitation.id
                        )}
                        disabled={processingPlaylistInvitations.has(
                          invitation.id
                        )}
                        onPress={() =>
                          handleDeclinePlaylistInvitation(invitation)
                        }
                        width="full"
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          }

          if (notification.type === 'event_invitation') {
            const invitation = notification.data as EventInvitation;
            return (
              <EventInvitationCard
                key={notification.id}
                invitation={invitation}
                profile={profile}
                animatedStyle={animatedStyle}
                processingEventInvitations={processingEventInvitations}
                onAccept={handleAcceptEventInvitation}
                onDecline={handleDeclineEventInvitation}
              />
            );
          }

          if (notification.type === 'ownership_transfer') {
            const transfer = notification.data;
            return (
              <OwnershipTransferCard
                key={notification.id}
                notification={transfer}
                animatedStyle={animatedStyle}
                processingNotifications={processingOwnershipTransfers}
                onMarkRead={handleMarkOwnershipTransferAsRead}
                onNavigateToPlaylists={handleNavigateToPlaylists}
              />
            );
          }

          return null;
        })}
      </View>
    </ScrollView>
  );
};

export default NotificationsScreen;

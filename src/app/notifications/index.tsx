import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import {
  type FriendRequestItem,
  useFriendRequests
} from '@/hooks/useFriendRequests';
import { usePlaylistInvitations } from '@/hooks/usePlaylistInvitations';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import { usePressAnimation } from '@/style/usePressAnimation';
import { PlaylistInvitation } from '@/utils/firebase/firebase-service-playlists';
import { parseFirestoreDate } from '@/utils/firebase/firestore-date-utils';

const NotificationsScreen = () => {
  const { theme } = useTheme();
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
    friendRequests,
    isLoading: friendRequestsLoading,
    refreshFriendRequests,
    acceptFriendRequest,
    declineFriendRequest
  } = useFriendRequests();

  const [processingInvitations, setProcessingInvitations] = useState<
    Set<string>
  >(new Set());
  const [processingFriendRequests, setProcessingFriendRequests] = useState<
    Set<string>
  >(new Set());

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([refreshInvitations(), refreshFriendRequests()]);
  };

  const sortedInvitations = useMemo(() => {
    return [...playlistInvitations].sort((a, b) => {
      const dateA = parseFirestoreDate(a.invitedAt).getTime();
      const dateB = parseFirestoreDate(b.invitedAt).getTime();
      return dateB - dateA;
    });
  }, [playlistInvitations]);

  const handleAcceptInvitation = async (invitation: PlaylistInvitation) => {
    setProcessingInvitations((prev) => new Set(prev).add(invitation.id));
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
      setProcessingInvitations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const handleDeclineInvitation = async (invitation: PlaylistInvitation) => {
    setProcessingInvitations((prev) => new Set(prev).add(invitation.id));
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
      setProcessingInvitations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const isLoading = invitationsLoading || friendRequestsLoading;

  if (isLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (sortedInvitations.length === 0 && friendRequests.length === 0) {
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

  const totalNew = friendRequests.length + sortedInvitations.length;

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
                {[
                  friendRequests.length
                    ? `${friendRequests.length} friend request${
                        friendRequests.length === 1 ? '' : 's'
                      }`
                    : null,
                  sortedInvitations.length
                    ? `${sortedInvitations.length} playlist invitation${
                        sortedInvitations.length === 1 ? '' : 's'
                      }`
                    : null,
                  totalNew > 0 ? `${totalNew} new` : null
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </TextCustom>
            </View>
          </View>
        </View>

        {friendRequests.map((request) => (
          <Animated.View key={request.id} style={animatedStyle}>
            <View className="rounded-md border border-border bg-bg-secondary px-4 py-3">
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="account-plus"
                  size={18}
                  color={themeColors[theme]['primary']}
                  style={{ marginRight: 8 }}
                />
                <TextCustom
                  type="semibold"
                  size="s"
                  color={themeColors[theme]['text-main']}
                >
                  Friend Request
                </TextCustom>
              </View>

              <TextCustom
                size="s"
                color={themeColors[theme]['text-secondary']}
                className="mt-1"
              >
                <TextCustom
                  type="link"
                  size="s"
                  onPress={() => router.push(`/users/${request.requesterId}`)}
                >
                  {request.requesterName}
                </TextCustom>{' '}
                wants to connect with you.
              </TextCustom>

              <View className="mt-3 flex-row items-center gap-2">
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
        ))}

        {sortedInvitations.map((invitation) => (
          <Animated.View key={invitation.id} style={animatedStyle}>
            <View className="rounded-md border border-border bg-bg-secondary px-4 py-3">
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="playlist-music"
                  size={18}
                  color={themeColors[theme]['primary']}
                  style={{ marginRight: 8 }}
                />
                <TextCustom
                  type="semibold"
                  size="s"
                  color={themeColors[theme]['text-main']}
                >
                  Playlist Invitation
                </TextCustom>
              </View>

              <TextCustom
                size="s"
                color={themeColors[theme]['text-secondary']}
                className="mt-1"
              >
                {`You've been invited to collaborate on "${invitation.playlistName || 'a playlist'}".`}
              </TextCustom>

              {/* Action buttons */}
              <View className="mt-3 flex-row items-center gap-2">
                <View className="flex-1">
                  <RippleButton
                    title="Accept"
                    size="sm"
                    loading={processingInvitations.has(invitation.id)}
                    disabled={processingInvitations.has(invitation.id)}
                    onPress={() => handleAcceptInvitation(invitation)}
                    width="full"
                  />
                </View>
                <View className="flex-1">
                  <RippleButton
                    title="Decline"
                    size="sm"
                    variant="outline"
                    loading={processingInvitations.has(invitation.id)}
                    disabled={processingInvitations.has(invitation.id)}
                    onPress={() => handleDeclineInvitation(invitation)}
                    width="full"
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
};

export default NotificationsScreen;

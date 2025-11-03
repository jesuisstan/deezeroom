import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { usePlaylistInvitations } from '@/hooks/usePlaylistInvitations';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useNotifications } from '@/providers/NotificationsProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import {
  PlaylistInvitation,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';

interface NotificationItem {
  id: string;
  type: 'invitation' | 'response';
  invitation: PlaylistInvitation;
  isUnread?: boolean;
}

interface SwipeableNotificationProps {
  notification: NotificationItem;
  onDismiss: () => void;
  isResponse: boolean;
  processingInvitations: Set<string>;
  handleAcceptInvitation: (invitation: PlaylistInvitation) => void;
  handleDeclineInvitation: (invitation: PlaylistInvitation) => void;
  theme: 'light' | 'dark';
}

const SwipeableNotification = ({
  notification,
  onDismiss,
  isResponse,
  processingInvitations,
  handleAcceptInvitation,
  handleDeclineInvitation,
  theme
}: SwipeableNotificationProps) => {
  const invitation = notification.invitation;
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if ((event.translationX < -100 || event.velocityX < -500) && isResponse) {
        translateX.value = withTiming(-1000, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }]
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <View
          className="mb-2 rounded-lg border px-4 py-3"
          style={{
            backgroundColor: themeColors[theme]['bg-secondary'],
            borderColor: themeColors[theme]['border']
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name={isResponse ? 'email' : 'account-plus'}
                  size={18}
                  color={
                    isResponse
                      ? invitation.status === 'accepted'
                        ? themeColors[theme]['intent-success']
                        : themeColors[theme]['intent-error']
                      : themeColors[theme]['primary']
                  }
                  style={{ marginRight: 8 }}
                />
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-main']}
                  style={{ fontWeight: '500' }}
                >
                  {isResponse
                    ? invitation.status === 'accepted'
                      ? 'Accepted'
                      : 'Declined'
                    : 'Playlist Invitation'}
                </TextCustom>
              </View>

              <TextCustom
                size="s"
                color={themeColors[theme]['text-secondary']}
                className="mt-1"
                numberOfLines={2}
              >
                {isResponse
                  ? invitation.status === 'accepted'
                    ? `${invitation.displayName || invitation.email || 'Someone'} accepted your invitation`
                    : `${invitation.displayName || invitation.email || 'Someone'} declined your invitation`
                  : `You've been invited to collaborate on "${invitation.playlistName || ''}" playlist`}
              </TextCustom>
            </View>
          </View>

          {!isResponse && (
            <View className="mt-2 flex-row gap-2">
              <RippleButton
                title="Accept"
                size="sm"
                loading={processingInvitations.has(invitation.id)}
                disabled={processingInvitations.has(invitation.id)}
                onPress={() => handleAcceptInvitation(invitation)}
                className="flex-1"
              />
              <RippleButton
                title="Decline"
                size="sm"
                variant="outline"
                loading={processingInvitations.has(invitation.id)}
                disabled={processingInvitations.has(invitation.id)}
                onPress={() => handleDeclineInvitation(invitation)}
                className="flex-1"
              />
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const NotificationsScreen = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const { clearBadge } = useNotifications();
  const {
    invitations,
    unreadCount,
    isLoading,
    refreshInvitations,
    markAsRead,
    acceptInvitation,
    declineInvitation
  } = usePlaylistInvitations();

  const [sentInvitationsResponses, setSentInvitationsResponses] = useState<
    PlaylistInvitation[]
  >([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(true);
  const [viewedResponseIds, setViewedResponseIds] = useState<Set<string>>(
    new Set()
  );

  const [processingInvitations, setProcessingInvitations] = useState<
    Set<string>
  >(new Set());

  // Load viewed response IDs from storage
  useEffect(() => {
    const loadViewedResponseIds = async () => {
      if (!user) return;

      try {
        const key = `viewed_responses_${user.uid}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          setViewedResponseIds(new Set(ids));
        }
      } catch (error) {
        Logger.error('Error loading viewed response IDs:', error);
      }
    };

    loadViewedResponseIds();
  }, [user]);

  // Function to mark a response as viewed (will be called on swipe)
  const markResponseAsViewed = useCallback(
    async (responseId: string) => {
      if (!user) return;

      try {
        const updated = new Set(viewedResponseIds);
        updated.add(responseId);
        setViewedResponseIds(updated);

        const key = `viewed_responses_${user.uid}`;
        await AsyncStorage.setItem(key, JSON.stringify([...updated]));
      } catch (error) {
        Logger.error('Error saving viewed response IDs:', error);
      }
    },
    [user, viewedResponseIds]
  );

  // Clear badge when screen is mounted (user is viewing notifications)
  useEffect(() => {
    clearBadge();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load sent invitations responses
  const loadSentInvitationsResponses = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingResponses(true);
      const responses = await PlaylistService.getUserSentInvitationsResponses(
        user.uid
      );
      setSentInvitationsResponses(responses);
    } catch (error) {
      Logger.error('Error loading sent invitations responses:', error);
    } finally {
      setIsLoadingResponses(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    setIsLoadingResponses(true);

    const unsubscribe = PlaylistService.subscribeToUserSentInvitationsResponses(
      user.uid,
      (responses) => {
        setSentInvitationsResponses(responses);
        setIsLoadingResponses(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Mark notifications as read only when user actively interacts with the screen
  const handleRefresh = async () => {
    await refreshInvitations();
    await loadSentInvitationsResponses();
    // Mark as read when user actively refreshes
    if (unreadCount > 0) {
      markAsRead();
      await clearBadge(); // Clear native badge
    }
  };

  // Filter out viewed responses
  const unviewedResponses = sentInvitationsResponses.filter(
    (inv) => !viewedResponseIds.has(inv.id)
  );

  // Combine all notifications (only unviewed responses)
  const allNotifications: NotificationItem[] = [
    ...invitations.map((inv) => ({
      id: inv.id,
      type: 'invitation' as const,
      invitation: inv
    })),
    ...unviewedResponses.map((inv) => ({
      id: `response-${inv.id}`,
      type: 'response' as const,
      invitation: inv
    }))
  ];

  // Sort by date (most recent first)
  const sortedNotifications = allNotifications.sort((a, b) => {
    const dateA = new Date(a.invitation.invitedAt).getTime();
    const dateB = new Date(b.invitation.invitedAt).getTime();
    return dateB - dateA;
  });

  const handleAcceptInvitation = async (invitation: PlaylistInvitation) => {
    setProcessingInvitations((prev) => new Set(prev).add(invitation.id));
    try {
      await acceptInvitation(invitation);
      Notifier.shoot({
        type: 'success',
        title: 'Success',
        message: 'Invitation accepted'
      });
    } catch (error) {
      Logger.error(String(error));
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
      await declineInvitation(invitation);
      Notifier.shoot({
        type: 'warn',
        title: 'Warning',
        message: 'Invitation declined'
      });
    } catch (error) {
      Logger.error(String(error));
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

  if (isLoading || isLoadingResponses) {
    return <ActivityIndicatorScreen />;
  }

  if (sortedNotifications.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: themeColors[theme]['bg-main'] }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        <View
          className="flex-1 items-center justify-center p-8"
          style={containerWidthStyle}
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
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 p-3"
      style={{ backgroundColor: themeColors[theme]['bg-main'] }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      <View style={containerWidthStyle}>
        <View className="mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <TextCustom size="xs" color={themeColors[theme]['text-main']}>
                {invitations.length} invitation(s) •{' '}
                {sentInvitationsResponses.length} response(s)
                {unreadCount > 0 && ` • ${unreadCount} new`}
              </TextCustom>
            </View>

            {unreadCount > 0 && (
              <RippleButton
                title="Mark all read"
                size="sm"
                variant="outline"
                onPress={markAsRead}
              />
            )}
          </View>
        </View>

        {sortedNotifications.map((notification) => {
          const isResponse = notification.type === 'response';

          return (
            <SwipeableNotification
              key={notification.id}
              notification={notification}
              onDismiss={() => {
                if (isResponse) {
                  markResponseAsViewed(notification.invitation.id);
                }
              }}
              isResponse={isResponse}
              processingInvitations={processingInvitations}
              handleAcceptInvitation={handleAcceptInvitation}
              handleDeclineInvitation={handleDeclineInvitation}
              theme={theme}
            />
          );
        })}
      </View>
    </ScrollView>
  );
};

export default NotificationsScreen;

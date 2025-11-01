import { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, View } from 'react-native';

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
  acceptFriendship,
  deleteFriendship,
  listPendingConnectionsFor,
  rejectFriendship
} from '@/utils/firebase/firebase-service-connections';
import {
  PlaylistInvitation,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';
import { getPublicProfileDoc } from '@/utils/firebase/firebase-service-profiles';

type NotificationItem =
  | {
      id: string;
      type: 'invitation' | 'response';
      invitation: PlaylistInvitation;
      isUnread?: boolean;
    }
  | {
      id: string; // connection id
      type: 'friend-request';
      request: {
        id: string; // connection id
        otherUid: string;
        displayName: string;
        photoURL?: string;
        createdAtMs?: number;
      };
    };

interface SwipeableNotificationProps {
  notification: NotificationItem;
  onDismiss: () => void;
  isResponse: boolean;
  processingInvitations: Set<string>;
  processingFriendRequests: Set<string>;
  handleAcceptInvitation: (invitation: PlaylistInvitation) => void;
  handleDeclineInvitation: (invitation: PlaylistInvitation) => void;
  handleAcceptFriendRequest: (requestId: string, otherUid: string) => void;
  handleDeclineFriendRequest: (requestId: string, otherUid: string) => void;
  theme: 'light' | 'dark';
}

const SwipeableNotification = ({
  notification,
  onDismiss,
  isResponse,
  processingInvitations,
  processingFriendRequests,
  handleAcceptInvitation,
  handleDeclineInvitation,
  handleAcceptFriendRequest,
  handleDeclineFriendRequest,
  theme
}: SwipeableNotificationProps) => {
  const isFriendRequest = notification.type === 'friend-request';
  const invitation = notification.type !== 'friend-request' ? notification.invitation : undefined;
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const swipeLeft = event.translationX < -100 || event.velocityX < -500;
      const swipeRight = event.translationX > 100 || event.velocityX > 500;

      if ((swipeLeft || swipeRight) && isResponse) {
        const direction = swipeLeft ? -1000 : 1000;
        translateX.value = withTiming(direction, { duration: 200 }, () => {
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
                  name={
                    isFriendRequest
                      ? 'account-plus'
                      : isResponse
                      ? 'email'
                      : 'account-plus'
                  }
                  size={18}
                  color={
                    isFriendRequest
                      ? themeColors[theme]['primary']
                      : isResponse && invitation
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
                  {isFriendRequest
                    ? 'Friend Request'
                    : isResponse && invitation
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
                {isFriendRequest
                  ? `${notification.request.displayName || 'Someone'} sent you a friend request`
                  : isResponse && invitation
                  ? invitation.status === 'accepted'
                    ? `${invitation.displayName || invitation.email || 'Someone'} accepted your invitation`
                    : `${invitation.displayName || invitation.email || 'Someone'} declined your invitation`
                  : invitation
                  ? `You've been invited to collaborate on "${invitation.playlistName || ''}" playlist`
                  : ''}
              </TextCustom>
            </View>
          </View>

          {isFriendRequest ? (
            <View className="mt-2 flex-row gap-2">
              <RippleButton
                title="Accept"
                size="sm"
                loading={processingFriendRequests.has(notification.request.id)}
                disabled={processingFriendRequests.has(notification.request.id)}
                onPress={() =>
                  handleAcceptFriendRequest(
                    notification.request.id,
                    notification.request.otherUid
                  )
                }
                className="flex-1"
              />
              <RippleButton
                title="Decline"
                size="sm"
                variant="outline"
                loading={processingFriendRequests.has(notification.request.id)}
                disabled={processingFriendRequests.has(notification.request.id)}
                onPress={() =>
                  handleDeclineFriendRequest(
                    notification.request.id,
                    notification.request.otherUid
                  )
                }
                className="flex-1"
              />
            </View>
          ) : (
            !isResponse && invitation && (
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
            )
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
  const [processingFriendRequests, setProcessingFriendRequests] = useState<
    Set<string>
  >(new Set());

  // Friend requests state
  const [incomingFriends, setIncomingFriends] = useState<
    { otherUid: string; id: string; requestedBy?: string | undefined; createdAtMs?: number }[]
  >([]);
  const [outgoingFriends, setOutgoingFriends] = useState<
    { otherUid: string; id: string; requestedBy?: string | undefined }[]
  >([]);
  const [people, setPeople] = useState<
    Record<string, { displayName?: string; photoURL?: string }>
  >({});
  const [loadingFriends, setLoadingFriends] = useState<boolean>(true);

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
        await AsyncStorage.setItem(key, JSON.stringify(Array.from(updated)));
      } catch (error) {
        Logger.error('Error saving viewed response IDs:', error);
      }
    },
    [user, viewedResponseIds]
  );

  // Load friend requests (incoming/outgoing) and public profiles
  const loadFriendRequests = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingFriends(true);
      const items = await listPendingConnectionsFor(user.uid);
      const inc = items
        .filter((c) => c.requestedBy && c.requestedBy !== user.uid)
        .map((c) => ({
          id: c.id,
          requestedBy: c.requestedBy,
          otherUid: c.userA === user.uid ? c.userB : c.userA,
          createdAtMs:
            typeof c.createdAt?.toMillis === 'function'
              ? c.createdAt.toMillis()
              : undefined
        }));
      const out = items
        .filter((c) => !c.requestedBy || c.requestedBy === user.uid)
        .map((c) => ({
          id: c.id,
          requestedBy: c.requestedBy,
          otherUid: c.userA === user.uid ? c.userB : c.userA
        }));
      setIncomingFriends(inc);
      setOutgoingFriends(out);

      const uids = Array.from(new Set([...inc, ...out].map((i) => i.otherUid)));
      const tuples = await Promise.all(
        uids.map(async (uid) => {
          const p = await getPublicProfileDoc(uid);
          return [
            uid,
            { displayName: p?.displayName, photoURL: p?.photoURL }
          ] as const;
        })
      );
      const map: Record<string, { displayName?: string; photoURL?: string }> =
        {};
      tuples.forEach(([k, v]) => (map[k] = v));
      setPeople(map);
    } catch (error) {
      Logger.error('Error loading friend requests:', error);
    } finally {
      setLoadingFriends(false);
    }
  }, [user]);

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

  // Initial load of friend requests
  useEffect(() => {
    loadFriendRequests();
  }, [loadFriendRequests]);

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
    // Refresh friend requests too
    await loadFriendRequests();
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

  // Combine all notifications (only unviewed responses) – playlist-only here
  type PlaylistNotification = Extract<
    NotificationItem,
    { type: 'invitation' | 'response' }
  >;
  const allNotifications: PlaylistNotification[] = [
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

  if (isLoading || isLoadingResponses || loadingFriends) {
    return <ActivityIndicatorScreen />;
  }

  const friendRequestsCount = incomingFriends.length + outgoingFriends.length;

  if (sortedNotifications.length === 0 && friendRequestsCount === 0) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: themeColors[theme]['bg-main'] }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isLoadingResponses || loadingFriends}
            onRefresh={handleRefresh}
          />
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
        <RefreshControl
          refreshing={isLoading || isLoadingResponses || loadingFriends}
          onRefresh={handleRefresh}
        />
      }
    >
      <View style={containerWidthStyle}>
        <View className="mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <TextCustom size="xs" color={themeColors[theme]['text-main']}>
                {invitations.length} invitation(s) •{' '}
                {sentInvitationsResponses.length} response(s)
                {friendRequestsCount > 0 &&
                  ` • ${friendRequestsCount} friend request(s)`}
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

        {/* Build a unified list: playlist notifications + friend requests */}
        {(
          [
            ...sortedNotifications,
            // Append friend request notifications (incoming only)
            ...incomingFriends.map((req) => {
              const person = people[req.otherUid] || {};
              const displayName = person.displayName || 'User';
              const photoURL = person.photoURL;
              const createdAtMs = req.createdAtMs ?? 0;
              const item: NotificationItem = {
                id: req.id,
                type: 'friend-request',
                request: {
                  id: req.id,
                  otherUid: req.otherUid,
                  displayName,
                  photoURL,
                  createdAtMs
                }
              };
              return item;
            })
          ]
            // Re-sort by date descending
            .sort((a, b) => {
              const aTime =
                a.type === 'friend-request'
                  ? a.request.createdAtMs || 0
                  : new Date(a.invitation.invitedAt).getTime();
              const bTime =
                b.type === 'friend-request'
                  ? b.request.createdAtMs || 0
                  : new Date(b.invitation.invitedAt).getTime();
              return bTime - aTime;
            })
        ).map((notification) => {
          const isResponse = notification.type === 'response';

          return (
            <SwipeableNotification
              key={notification.id}
              notification={notification}
              onDismiss={() => {
                if (notification.type === 'response') {
                  markResponseAsViewed(notification.invitation.id);
                }
              }}
              isResponse={isResponse}
              processingInvitations={processingInvitations}
              processingFriendRequests={processingFriendRequests}
              handleAcceptInvitation={handleAcceptInvitation}
              handleDeclineInvitation={handleDeclineInvitation}
              handleAcceptFriendRequest={async (requestId, otherUid) => {
                if (!user) return;
                setProcessingFriendRequests((prev) => new Set(prev).add(requestId));
                try {
                  const res = await acceptFriendship(user.uid, otherUid, user.uid);
                  if (res.success) {
                    Notifier.shoot({ type: 'success', message: 'Friend request accepted' });
                    setIncomingFriends((prev) => prev.filter((r) => r.id !== requestId));
                  } else {
                    Notifier.shoot({ type: 'error', message: res.message || 'Failed to accept' });
                  }
                } finally {
                  setProcessingFriendRequests((prev) => {
                    const s = new Set(prev);
                    s.delete(requestId);
                    return s;
                  });
                }
              }}
              handleDeclineFriendRequest={async (requestId, otherUid) => {
                if (!user) return;
                setProcessingFriendRequests((prev) => new Set(prev).add(requestId));
                try {
                  const res = await rejectFriendship(user.uid, otherUid, user.uid);
                  if (res.success) {
                    Notifier.shoot({ type: 'info', message: 'Friend request rejected' });
                    setIncomingFriends((prev) => prev.filter((r) => r.id !== requestId));
                  } else {
                    Notifier.shoot({ type: 'error', message: res.message || 'Failed to reject' });
                  }
                } finally {
                  setProcessingFriendRequests((prev) => {
                    const s = new Set(prev);
                    s.delete(requestId);
                    return s;
                  });
                }
              }}
              theme={theme}
            />
          );
        })}
      </View>
    </ScrollView>
  );
};

export default NotificationsScreen;

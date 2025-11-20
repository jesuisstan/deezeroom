import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import clsx from 'clsx';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TabView } from 'react-native-tab-view';

import EditEventModal from '@/components/events/EditEventModal';
import EventCoverTab from '@/components/events/EventCoverTab';
import EventInfoTab from '@/components/events/EventInfoTab';
import EventMonitor from '@/components/events/EventMonitor';
import EventParticipantsTab from '@/components/events/EventParticipantsTab';
import EventStatusIndicator from '@/components/events/EventStatusIndicator';
import EventTrackCard from '@/components/events/EventTrackCard';
import PlayedTrackCard from '@/components/events/PlayedTrackCard';
import { Alert } from '@/components/modules/alert';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import AddTracksToPlaylistComponent from '@/components/playlists/AddTracksToPlaylistComponent';
import UserInviteComponent from '@/components/playlists/UserInviteComponent';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { Track } from '@/graphql/schema';
import { useEventStatus } from '@/hooks/useEventStatus';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import {
  Event,
  EventService,
  EventTrack
} from '@/utils/firebase/firebase-service-events';
import { UserProfile } from '@/utils/firebase/firebase-service-user';

const EventDetailScreen = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  const { currentTrack } = usePlaybackState();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [tracks, setTracks] = useState<EventTrack[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingVote, setProcessingVote] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [tracksTabIndex, setTracksTabIndex] = useState(0); // 0 = Queue, 1 = Played
  const [routes] = useState([
    { key: 'cover', title: 'Cover' },
    { key: 'info', title: 'Info' },
    { key: 'participants', title: 'Participants' }
  ]);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    const unsubscribe = EventService.subscribeToEvent(id, (updatedEvent) => {
      if (!updatedEvent) {
        setError('Event not found');
        setEvent(null);
        setIsLoading(false);
        return;
      }
      // Ignore subscription updates while we're manually updating status
      // This prevents intermediate status changes (draft -> live -> ended)
      // We'll use the forced refresh data instead
      if (isUpdatingStatus) {
        return;
      }
      setEvent(updatedEvent);
      setError(null);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [id, isUpdatingStatus]);

  useEffect(() => {
    if (!id) return;
    return EventService.subscribeToEventTracks(id, (updatedTracks) => {
      setTracks(updatedTracks);
    });
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    return EventService.subscribeToUserVotes(id, user.uid, (votes) => {
      setUserVotes(votes);
    });
  }, [id, user]);

  // Use custom hook for real-time event status updates
  const { eventStatus, isEventEnded, hasEventStarted } = useEventStatus(event);
  // Add padding when mini player is visible
  const bottomPadding = useMemo(() => {
    return currentTrack
      ? Platform.OS === 'web'
        ? 16 + MINI_PLAYER_HEIGHT
        : MINI_PLAYER_HEIGHT
      : 0;
  }, [currentTrack]);

  const canVote = useMemo(() => {
    if (!event || !user) return false;
    return EventService.canUserVoteWithEvent(event, user.uid);
  }, [event, user]);

  const canAddTrack = useMemo(() => {
    if (!event || !user) return false;
    return EventService.canUserAddTrack(event, user.uid);
  }, [event, user]);

  const canManageEvent = useMemo(() => {
    if (!event || !user) return false;
    return EventService.canUserManageEvent(event, user.uid);
  }, [event, user]);

  const isPublicInvitedNonParticipant = useMemo(() => {
    if (!event || !user) return false;
    return (
      event.visibility === 'public' &&
      event.voteLicense === 'invited' &&
      !event.participantIds.includes(user.uid) &&
      !event.hostIds.includes(user.uid)
    );
  }, [event, user]);

  const currentTrackIds = useMemo(
    () => tracks.map((track) => track.trackId),
    [tracks]
  );

  // Filter queue tracks (exclude currently playing track)
  const queueTracks = useMemo(() => {
    if (!event?.currentlyPlayingTrack) return tracks;
    return tracks.filter(
      (track) => track.trackId !== event.currentlyPlayingTrack?.trackId
    );
  }, [tracks, event?.currentlyPlayingTrack]);

  // Get played tracks from event
  const playedTracks = useMemo(() => {
    return event?.playedTracks || [];
  }, [event?.playedTracks]);

  const isHost = useMemo(() => {
    if (!event || !user) return false;
    return event.hostIds.includes(user.uid);
  }, [event, user]);

  const handleBack = () => {
    router.back();
  };

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setIsRefreshing(true);
    try {
      const freshEvent = await EventService.getEvent(id);
      setEvent(freshEvent);
    } catch (error) {
      Logger.error('Error refreshing event:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [id]);

  const handleAddTrack = async (track: Track) => {
    if (!id || !user) {
      Notifier.shoot({
        type: 'error',
        title: 'Authentication required',
        message: 'You must be logged in to add tracks'
      });
      return;
    }

    try {
      await EventService.addTrackToEvent(id, track, user.uid);
      Notifier.shoot({
        type: 'success',
        title: 'Track added',
        message: `${track.title} added to event`
      });
    } catch (error: any) {
      Logger.error('Error adding track to event:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: error?.message || 'Failed to add track'
      });
    }
  };

  const handleToggleVote = async (trackId: string) => {
    if (!id || !user) {
      Notifier.shoot({
        type: 'error',
        title: 'Authentication required',
        message: 'You must be logged in to vote'
      });
      return;
    }

    if (!canVote) {
      Notifier.shoot({
        type: 'warn',
        title: 'Voting unavailable',
        message: 'You do not have permission to vote in this event'
      });
      return;
    }

    try {
      setProcessingVote(trackId);
      if (userVotes[trackId]) {
        await EventService.removeVoteFromTrack(id, trackId, user.uid);
      } else {
        await EventService.voteForTrack(id, trackId, user.uid);
      }
    } catch (error: any) {
      Logger.error('Error toggling vote:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Voting failed',
        message: error?.message || 'Unable to update vote'
      });
    } finally {
      setProcessingVote(null);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!id || !user) return;

    try {
      await EventService.removeTrackFromEvent(id, trackId, user.uid);
      Notifier.shoot({
        type: 'warn',
        title: 'Track removed',
        message: 'Track has been removed from the event'
      });
    } catch (error: any) {
      Logger.error('Error removing track from event:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: error?.message || 'Failed to remove track'
      });
    }
  };

  const handleEventUpdated = async () => {
    // Reload event after update
    if (id) {
      try {
        const freshEvent = await EventService.getEvent(id);
        if (freshEvent) {
          setEvent(freshEvent);
        }
      } catch (error) {
        Logger.error('Error reloading event after update:', error);
      }
    }
  };

  const handleStartEventEarly = async () => {
    if (!id || !user || !event || isUpdatingStatus) return;

    Alert.confirm(
      'Start Event Early?',
      'Are you sure you want to start this event now? The event will begin immediately.',
      async () => {
        setIsUpdatingStatus(true);
        try {
          await EventService.startEventEarly(id, user.uid);
          // Real-time subscription will automatically update the event
          Notifier.shoot({
            type: 'success',
            title: 'Event Started',
            message: 'Event has been started early'
          });
        } catch (error: any) {
          Logger.error('Error starting event early:', error);
          Notifier.shoot({
            type: 'error',
            title: 'Error',
            message: error?.message || 'Failed to start event early'
          });
        } finally {
          setIsUpdatingStatus(false);
        }
      }
    );
  };

  const handleEndEventEarly = async () => {
    if (!id || !user || !event || isUpdatingStatus) return;

    Alert.confirm(
      'End Event Early?',
      'Are you sure you want to end this event now? The event will be closed immediately and participants will no longer be able to vote or add tracks.',
      async () => {
        setIsUpdatingStatus(true);
        try {
          await EventService.endEventEarly(id, user.uid);
          // Real-time subscription will automatically update the event
          Notifier.shoot({
            type: 'success',
            title: 'Event Ended',
            message: 'Event has been ended early'
          });
        } catch (error: any) {
          Logger.error('Error ending event early:', error);
          Notifier.shoot({
            type: 'error',
            title: 'Error',
            message: error?.message || 'Failed to end event early'
          });
        } finally {
          setIsUpdatingStatus(false);
        }
      }
    );
  };

  const handleSendInvitations = async (selectedUsers: UserProfile[]) => {
    if (!event || !user || selectedUsers.length === 0) return;

    try {
      const invitationResult = await EventService.inviteMultipleUsersToEvent(
        event.id,
        selectedUsers.map((user) => ({
          userId: user.uid
        })),
        user.uid
      );

      if (invitationResult.success && invitationResult.invitedCount > 0) {
        Notifier.shoot({
          type: 'success',
          title: 'Invitations Sent',
          message: `${invitationResult.invitedCount} invitation(s) sent successfully!`
        });

        // Show warnings for any errors
        if (invitationResult.errors.length > 0) {
          Notifier.shoot({
            type: 'warn',
            title: 'Some invitations failed',
            message: invitationResult.errors.join(', ')
          });
        }

        // Reload event to get updated participants
        await handleEventUpdated();
      } else {
        Notifier.shoot({
          type: 'error',
          title: 'Failed to Send Invitations',
          message:
            invitationResult.errors.join(', ') || 'No invitations were sent'
        });
      }
    } catch (error) {
      Logger.error('Error sending invitations:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to send invitations'
      });
      throw error;
    }
  };

  const renderScene = ({ route }: { route: { key: string } }) => {
    switch (route.key) {
      case 'cover':
        return <EventCoverTab event={event!} />;
      case 'info':
        return <EventInfoTab event={event!} />;
      case 'participants':
        return (
          <EventParticipantsTab
            hostIds={event!.hostIds || []}
            participantIds={event!.participantIds || []}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (error || !event) {
    return (
      <View
        className="flex-1 items-center justify-center px-4"
        style={{
          backgroundColor: themeColors[theme]['bg-main'],
          ...containerWidthStyle
        }}
      >
        <MaterialCommunityIcons
          name="alert-circle"
          size={42}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom className="mt-4 text-center opacity-70">
          {error || 'Event not found'}
        </TextCustom>
        <RippleButton
          title="Go Back"
          size="sm"
          onPress={handleBack}
          className="mt-4"
        />
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: themeColors[theme]['bg-main']
      }}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[themeColors[theme]['primary']]}
            tintColor={themeColors[theme]['primary']}
          />
        }
        contentContainerStyle={{
          paddingBottom: 8 + bottomPadding,
          ...containerWidthStyle
        }}
        showsVerticalScrollIndicator={true}
      >
        {/* Adaptive layout: horizontal for web, vertical for mobile */}
        <View
          style={
            Platform.OS === 'web'
              ? { flexDirection: 'row', gap: 24, paddingHorizontal: 16 }
              : {}
          }
        >
          {/* Left Column (Web) / Top Section (Mobile): TabView with info */}
          <View
            style={
              Platform.OS === 'web'
                ? { width: 450, flexShrink: 0 }
                : { width: '100%' }
            }
          >
            <View style={{ position: 'relative' }}>
              <TabView
                navigationState={{ index: tabIndex, routes }}
                renderScene={renderScene}
                onIndexChange={setTabIndex}
                initialLayout={{
                  width:
                    Platform.OS === 'web' ? 450 : Dimensions.get('window').width
                }}
                style={{
                  height:
                    Platform.OS === 'web' ? 450 : Dimensions.get('window').width
                }}
                renderTabBar={() => null}
              />

              {/* Event status indicator */}
              <EventStatusIndicator
                eventStatus={eventStatus}
                isUpdatingStatus={isUpdatingStatus}
              />

              {/* Event actions bar */}
              {!isEventEnded && (
                <View
                  style={{
                    position: 'absolute',
                    zIndex: 10,
                    right: 12,
                    bottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 6,
                    padding: 2,
                    backgroundColor: themeColors[theme]['bg-secondary'] + '99',
                    borderColor: themeColors[theme]['border'],
                    borderWidth: 1,
                    opacity: isUpdatingStatus ? 0.5 : 1
                  }}
                >
                  {canManageEvent && (
                    <>
                      {!hasEventStarted && (
                        <IconButton
                          accessibilityLabel="Start event early"
                          onPress={handleStartEventEarly}
                          disabled={isUpdatingStatus}
                          loading={isUpdatingStatus}
                        >
                          <MaterialCommunityIcons
                            name="flag-triangle"
                            size={20}
                            color={themeColors[theme]['primary']}
                          />
                        </IconButton>
                      )}
                      {hasEventStarted && !isEventEnded && (
                        <IconButton
                          accessibilityLabel="End event early"
                          onPress={handleEndEventEarly}
                          disabled={isUpdatingStatus}
                          loading={isUpdatingStatus}
                        >
                          <MaterialCommunityIcons
                            name="flag-variant-remove-outline"
                            size={20}
                            color={themeColors[theme]['intent-error']}
                          />
                        </IconButton>
                      )}
                      <IconButton
                        accessibilityLabel="Edit event"
                        onPress={() => setShowEditModal(true)}
                        disabled={isUpdatingStatus}
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={20}
                          color={themeColors[theme]['text-main']}
                        />
                      </IconButton>
                      <IconButton
                        accessibilityLabel="Invite participants"
                        onPress={() => {
                          if (!event || !user || isUpdatingStatus) return;
                          setShowInviteModal(true);
                        }}
                        disabled={isUpdatingStatus}
                      >
                        <MaterialCommunityIcons
                          name="account-plus-outline"
                          size={20}
                          color={themeColors[theme]['text-main']}
                        />
                      </IconButton>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Rectangular indicators-switches under tabs (no labels) */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 4
              }}
            >
              {routes.map((route, idx) => (
                <Pressable
                  key={route.key}
                  onPress={() => setTabIndex(idx)}
                  style={{
                    width: 16,
                    height: 4,
                    borderRadius: 4,
                    backgroundColor:
                      idx === tabIndex
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-secondary'] + '55'
                  }}
                />
              ))}
            </View>
          </View>

          {/* Right Column (Web) / Bottom Section (Mobile): Tracks list */}
          <View className={clsx(Platform.OS === 'web' ? 'mt-4' : '', 'flex-1')}>
            {isEventEnded ? (
              <View
                style={{
                  borderRadius: 6,
                  padding: 16,
                  backgroundColor: themeColors[theme]['intent-warning'] + '22',
                  borderWidth: 1,
                  borderColor: themeColors[theme]['intent-warning'],
                  marginHorizontal: Platform.OS === 'web' ? 0 : 16
                }}
              >
                <TextCustom
                  type="semibold"
                  color={themeColors[theme]['intent-warning']}
                >
                  This event has ended
                </TextCustom>
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  Voting and editing are no longer available.
                </TextCustom>
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  You can still review the playlist below.
                </TextCustom>
              </View>
            ) : null}

            <View
              className="gap-4"
              style={{
                padding: Platform.OS === 'web' ? 0 : 16,
                paddingTop: Platform.OS === 'web' && !isEventEnded ? 0 : 16
              }}
            >
              {/* Event Monitor - показывается всегда для хостов, для участников только когда трек играет */}
              {(isHost || event?.currentlyPlayingTrack) && (
                <EventMonitor
                  event={event}
                  currentTrack={event.currentlyPlayingTrack || null}
                  isHost={isHost}
                  queueTracks={queueTracks}
                />
              )}

              {/* Tracks tabs - Queue / Played */}
              <View className="flex-row items-center gap-4">
                <Pressable
                  onPress={() => setTracksTabIndex(0)}
                  style={{
                    paddingBottom: 8,
                    borderBottomWidth: 2,
                    borderBottomColor:
                      tracksTabIndex === 0
                        ? themeColors[theme]['primary']
                        : 'transparent'
                  }}
                >
                  <TextCustom
                    type={tracksTabIndex === 0 ? 'semibold' : 'default'}
                    color={
                      tracksTabIndex === 0
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-secondary']
                    }
                  >
                    Queue ({queueTracks.length})
                  </TextCustom>
                </Pressable>

                <Pressable
                  onPress={() => setTracksTabIndex(1)}
                  style={{
                    paddingBottom: 8,
                    borderBottomWidth: 2,
                    borderBottomColor:
                      tracksTabIndex === 1
                        ? themeColors[theme]['primary']
                        : 'transparent'
                  }}
                >
                  <TextCustom
                    type={tracksTabIndex === 1 ? 'semibold' : 'default'}
                    color={
                      tracksTabIndex === 1
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-secondary']
                    }
                  >
                    Played ({playedTracks.length})
                  </TextCustom>
                </Pressable>
              </View>

              {/* Queue tab */}
              {tracksTabIndex === 0 ? (
                <>
                  {isPublicInvitedNonParticipant ? (
                    <View
                      style={{
                        borderRadius: 6,
                        padding: 12,
                        backgroundColor:
                          themeColors[theme]['intent-warning'] + '22',
                        borderWidth: 1,
                        borderColor: themeColors[theme]['intent-warning']
                      }}
                    >
                      <TextCustom
                        size="s"
                        color={themeColors[theme]['intent-warning']}
                      >
                        You can view this event, but only invited participants
                        can add tracks and vote.
                      </TextCustom>
                    </View>
                  ) : canAddTrack && eventStatus !== 'ended' ? (
                    <RippleButton
                      title="Add track"
                      size="sm"
                      onPress={() => setShowAddTrackModal(true)}
                      variant="outline"
                      leftIcon={
                        <MaterialCommunityIcons
                          name="plus"
                          size={18}
                          color={themeColors[theme]['primary']}
                        />
                      }
                    />
                  ) : null}

                  {queueTracks.length === 0 ? (
                    <View className="items-center justify-center py-12">
                      <MaterialCommunityIcons
                        name="playlist-music"
                        size={42}
                        color={themeColors[theme]['text-secondary']}
                      />
                      <TextCustom
                        className="mt-4 text-center"
                        color={themeColors[theme]['text-secondary']}
                      >
                        No tracks in queue
                        {canAddTrack ? '. Be the first to add one!' : ''}
                      </TextCustom>
                    </View>
                  ) : (
                    queueTracks.map((eventTrack) => (
                      <EventTrackCard
                        key={eventTrack.id}
                        track={eventTrack}
                        hasVoted={!!userVotes[eventTrack.trackId]}
                        canVote={canVote}
                        isVoting={processingVote === eventTrack.trackId}
                        onToggleVote={() =>
                          handleToggleVote(eventTrack.trackId)
                        }
                        currentUserId={user?.uid}
                        onRemoveTrack={() =>
                          handleRemoveTrack(eventTrack.trackId)
                        }
                      />
                    ))
                  )}
                </>
              ) : (
                /* Played tab */
                <>
                  {playedTracks.length === 0 ? (
                    <View className="items-center justify-center py-12">
                      <MaterialCommunityIcons
                        name="history"
                        size={42}
                        color={themeColors[theme]['text-secondary']}
                      />
                      <TextCustom
                        className="mt-4 text-center"
                        color={themeColors[theme]['text-secondary']}
                      >
                        No tracks played yet
                      </TextCustom>
                    </View>
                  ) : (
                    playedTracks
                      .slice()
                      .reverse()
                      .map((playedTrack, index) => (
                        <PlayedTrackCard
                          key={`${playedTrack.trackId}-${index}`}
                          playedTrack={playedTrack}
                        />
                      ))
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <SwipeModal
        title="Add tracks to event"
        modalVisible={showAddTrackModal}
        setVisible={setShowAddTrackModal}
        onClose={() => setShowAddTrackModal(false)}
      >
        <AddTracksToPlaylistComponent
          onAddTrack={handleAddTrack}
          onClose={() => setShowAddTrackModal(false)}
          currentPlaylistTracks={currentTrackIds}
          isVisible={showAddTrackModal}
        />
      </SwipeModal>

      {/* Edit Event Modal */}
      {event && (
        <EditEventModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          event={event}
          onEventUpdated={handleEventUpdated}
        />
      )}

      {/* Invite Users Modal */}
      {event && (
        <UserInviteComponent
          visible={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleSendInvitations}
          excludeUserId={user?.uid}
          existingUsers={[]}
          placeholder="Search users by email or name..."
          title="Invite Participants"
        />
      )}
    </View>
  );
};

export default EventDetailScreen;

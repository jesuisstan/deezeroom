import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  View
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TabView } from 'react-native-tab-view';

import EventCoverTab from '@/components/events/EventCoverTab';
import EventInfoTab from '@/components/events/EventInfoTab';
import EventParticipantsTab from '@/components/events/EventParticipantsTab';
import EventTrackCard from '@/components/events/EventTrackCard';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import AddTracksToPlaylistComponent from '@/components/playlists/AddTracksToPlaylistComponent';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { Track } from '@/graphql/schema';
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
import {
  UserProfile,
  UserService
} from '@/utils/firebase/firebase-service-user';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingVote, setProcessingVote] = useState<string | null>(null);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [tabIndex, setTabIndex] = useState(0);
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
      setEvent(updatedEvent);
      setError(null);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

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

  useEffect(() => {
    let cancelled = false;
    const loadParticipants = async () => {
      if (!event) {
        setParticipants([]);
        return;
      }
      const uniqueIds = Array.from(
        new Set([event.createdBy, ...(event.participantIds || [])])
      );
      try {
        const profiles = await Promise.all(
          uniqueIds.map((uid) => UserService.getUserProfile(uid))
        );
        if (!cancelled) {
          setParticipants(
            profiles.filter((profile): profile is UserProfile => !!profile)
          );
        }
      } catch (profileError) {
        Logger.warn('Failed to load event participants', profileError);
        if (!cancelled) {
          setParticipants([]);
        }
      }
    };
    loadParticipants();
    return () => {
      cancelled = true;
    };
  }, [event]);

  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0;
  }, [currentTrack]);

  const isEventEnded = useMemo(() => {
    return event ? EventService.hasEventEnded(event) : false;
  }, [event]);

  const canManage = useMemo(() => {
    if (!event || !user) return false;
    return EventService.canUserManageEvent(event, user.uid);
  }, [event, user]);

  const canVote = useMemo(() => {
    if (!event || !user) return false;
    return EventService.canUserVoteWithEvent(event, user.uid);
  }, [event, user]);

  const canAddTrack = useMemo(() => {
    if (!event || !user) return false;
    return EventService.canUserAddTrack(event, user.uid);
  }, [event, user]);

  const currentTrackIds = useMemo(
    () => tracks.map((track) => track.trackId),
    [tracks]
  );

  const ownerProfile = useMemo(() => {
    if (!event) return undefined;
    return participants.find((profile) => profile.uid === event.createdBy);
  }, [event, participants]);

  const otherParticipants = useMemo(() => {
    if (!event) return [] as UserProfile[];
    return participants.filter((profile) => profile.uid !== event.createdBy);
  }, [participants, event]);

  const ownerName = useMemo(() => {
    if (ownerProfile?.displayName) return ownerProfile.displayName;
    if (ownerProfile?.email) return ownerProfile.email;
    if (event?.ownerDisplayName) return event.ownerDisplayName;
    return 'Unknown user';
  }, [ownerProfile, event]);

  const ownerPhotoURL = ownerProfile?.photoURL || undefined;

  const participantViews = useMemo(
    () =>
      otherParticipants.map((profile) => ({
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        photoURL: profile.photoURL
      })),
    [otherParticipants]
  );

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

  const handlePlaceholderAction = (message: string) => {
    Notifier.shoot({ type: 'info', title: 'Coming soon', message });
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
            ownerId={event!.createdBy}
            ownerName={ownerName}
            ownerPhotoURL={ownerPhotoURL}
            participants={participantViews}
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
          size={48}
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
        <View style={{ position: 'relative' }}>
          <TabView
            navigationState={{ index: tabIndex, routes }}
            renderScene={renderScene}
            onIndexChange={setTabIndex}
            initialLayout={{ width: Dimensions.get('window').width }}
            style={{ height: Dimensions.get('window').width }}
            renderTabBar={() => null}
          />

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
                borderWidth: 1
              }}
            >
              <IconButton
                accessibilityLabel="Edit event"
                onPress={() =>
                  handlePlaceholderAction(
                    'Event editing will be available soon.'
                  )
                }
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={20}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>
              <IconButton
                accessibilityLabel="Invite participants"
                onPress={() =>
                  handlePlaceholderAction(
                    'Inviting participants will be available soon.'
                  )
                }
              >
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={20}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>
              <IconButton
                accessibilityLabel="Share event"
                onPress={() =>
                  handlePlaceholderAction('Sharing will be available soon.')
                }
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={20}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>
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

        {isEventEnded ? (
          <View
            style={{
              borderRadius: 6,
              padding: 16,
              backgroundColor: themeColors[theme]['intent-warning'] + '22',
              borderWidth: 1,
              borderColor: themeColors[theme]['intent-warning'],
              marginHorizontal: 16
            }}
          >
            <TextCustom
              type="semibold"
              color={themeColors[theme]['intent-warning']}
            >
              This event has ended
            </TextCustom>
            <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
              Voting and editing are no longer available.
            </TextCustom>
            <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
              You can still review the playlist below.
            </TextCustom>
          </View>
        ) : null}

        <View className="gap-4 p-4">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <TextCustom type="semibold">Tracks</TextCustom>
            <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
              {tracks.length} total
            </TextCustom>
          </View>

          {canAddTrack ? (
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

          {tracks.length === 0 ? (
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
                No tracks yet.{' '}
                {canAddTrack
                  ? 'Be the first to add one!'
                  : 'Ask the host to add some music.'}
              </TextCustom>
            </View>
          ) : (
            tracks.map((eventTrack) => (
              <EventTrackCard
                key={eventTrack.id}
                track={eventTrack}
                hasVoted={!!userVotes[eventTrack.trackId]}
                canVote={canVote}
                isVoting={processingVote === eventTrack.trackId}
                onToggleVote={() => handleToggleVote(eventTrack.trackId)}
                canManage={canManage}
                onRemoveTrack={
                  canManage
                    ? () => handleRemoveTrack(eventTrack.trackId)
                    : undefined
                }
              />
            ))
          )}
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
    </View>
  );
};

export default EventDetailScreen;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import EventTrackCard from '@/components/events/EventTrackCard';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import AddTracksButton from '@/components/playlists/AddTracksButton';
import AddTracksToPlaylistComponent from '@/components/playlists/AddTracksToPlaylistComponent';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { Track } from '@/graphql/schema';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import {
  Event,
  EventService,
  EventTrack
} from '@/utils/firebase/firebase-service-events';

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

  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0;
  }, [currentTrack]);

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

  if (isLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (error || !event) {
    return (
      <View
        className="flex-1 items-center justify-center px-4"
        style={{ backgroundColor: themeColors[theme]['bg-main'] }}
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
      style={{ backgroundColor: themeColors[theme]['bg-main'] }}
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
          paddingBottom: bottomPadding + 24,
          paddingHorizontal: 16,
          paddingTop: 16
        }}
        showsVerticalScrollIndicator={true}
      >
        <View style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <TextCustom
              type="title"
              size="xl"
              color={themeColors[theme]['text-main']}
            >
              {event.name}
            </TextCustom>
            {event.description ? (
              <TextCustom color={themeColors[theme]['text-secondary']}>
                {event.description}
              </TextCustom>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View
                style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}
              >
                <MaterialCommunityIcons
                  name={event.visibility === 'public' ? 'earth' : 'lock'}
                  size={16}
                  color={themeColors[theme]['text-secondary']}
                />
                <TextCustom
                  size="xs"
                  color={themeColors[theme]['text-secondary']}
                >
                  {event.visibility === 'public'
                    ? 'Public event'
                    : 'Private event'}
                </TextCustom>
              </View>
              <View
                style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}
              >
                <MaterialCommunityIcons
                  name="vote"
                  size={16}
                  color={themeColors[theme]['text-secondary']}
                />
                <TextCustom
                  size="xs"
                  color={themeColors[theme]['text-secondary']}
                >
                  {event.voteLicense === 'everyone'
                    ? 'Everyone can vote'
                    : event.voteLicense === 'invited'
                      ? 'Invited only'
                      : 'Location-based voting'}
                </TextCustom>
              </View>
            </View>
          </View>

          {canAddTrack ? (
            <AddTracksButton onPress={() => setShowAddTrackModal(true)} />
          ) : null}

          {tracks.length === 0 ? (
            <View className="items-center justify-center py-16">
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

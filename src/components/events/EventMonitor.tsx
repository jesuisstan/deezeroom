import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { DeezerService } from '@/utils/deezer/deezer-service';
import {
  CurrentlyPlayingTrack,
  Event,
  EventService,
  EventTrack
} from '@/utils/firebase/firebase-service-events';

interface EventMonitorProps {
  event: Event;
  currentTrack: CurrentlyPlayingTrack | null;
  isHost: boolean;
  queueTracks: EventTrack[];
  hasEventStarted: boolean;
  isEventEnded: boolean;
  onStartEventEarly?: () => void;
}

const EventMonitor = memo(
  ({
    event,
    currentTrack,
    isHost,
    queueTracks,
    hasEventStarted,
    isEventEnded,
    onStartEventEarly
  }: EventMonitorProps) => {
    const { theme } = useTheme();
    const { user } = useUser();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const didFinishHandledRef = useRef(false);
    const isProcessingFinishRef = useRef(false);
    const currentTrackIdRef = useRef<string | null>(null);
    const finishedTracksRef = useRef<Set<string>>(new Set());

    // Audio player for host only
    const audioPlayer = useAudioPlayer(
      isHost && previewUrl ? { uri: previewUrl } : undefined
    );

    // Load preview URL for host (only when track changes)
    useEffect(() => {
      if (!isHost || !currentTrack?.trackId) {
        setPreviewUrl(null);
        currentTrackIdRef.current = null;
        return;
      }

      // Reset finish handlers when track changes
      if (currentTrackIdRef.current !== currentTrack.trackId) {
        Logger.info(
          'Track changed, resetting finish handlers',
          {
            eventId: event.id,
            eventName: event.name,
            oldTrack: currentTrackIdRef.current,
            newTrack: currentTrack.trackId
          },
          '📺 EventMonitor'
        );

        // IMPORTANT: First reset flags and preview URL
        didFinishHandledRef.current = false;
        isProcessingFinishRef.current = false;
        setPreviewUrl(null); // Reset preview before loading new one

        // Then set new track ID
        currentTrackIdRef.current = currentTrack.trackId;

        const loadPreview = async () => {
          setIsLoadingPreview(true);
          try {
            const deezerService = DeezerService.getInstance();
            const track = await deezerService.getTrackById(
              currentTrack.trackId
            );
            setPreviewUrl(track?.preview || null);
          } catch (error) {
            Logger.error(
              'Error loading track preview:',
              { eventId: event.id, eventName: event.name, error: error },
              '📺 EventMonitor'
            );
            setPreviewUrl(null);
          } finally {
            setIsLoadingPreview(false);
          }
        };

        loadPreview();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTrack?.trackId, isHost]);

    // Cleanup finished tracks when queue changes
    useEffect(() => {
      if (!currentTrack) return;

      // Clear old finished tracks that are no longer in queue
      const currentTrackIds = new Set(queueTracks.map((t) => t.trackId));
      currentTrackIds.add(currentTrack.trackId); // Add current track

      const finishedToRemove: string[] = [];
      finishedTracksRef.current.forEach((trackId) => {
        if (!currentTrackIds.has(trackId)) {
          finishedToRemove.push(trackId);
        }
      });
      finishedToRemove.forEach((trackId) =>
        finishedTracksRef.current.delete(trackId)
      );
    }, [queueTracks, currentTrack]);

    // Stop audio player immediately when event ends
    useEffect(() => {
      if (!isHost || !audioPlayer || !isEventEnded) return;

      const stopPlayback = async () => {
        try {
          await audioPlayer.pause();
          Logger.info(
            'Audio player stopped: event ended',
            { eventId: event.id, eventName: event.name },
            '📺 EventMonitor'
          );
        } catch (error) {
          Logger.error(
            'Error stopping audio player:',
            { eventId: event.id, eventName: event.name, error: error },
            '📺 EventMonitor'
          );
        }
      };

      stopPlayback();
    }, [isEventEnded, isHost, audioPlayer, event.id, event.name]);

    // Sync audio player with isPlaying state
    useEffect(() => {
      if (!isHost || !audioPlayer || !previewUrl || isEventEnded) return;

      const sync = async () => {
        try {
          if (event.isPlaying) {
            await audioPlayer.play();
          } else {
            await audioPlayer.pause();
          }
        } catch (error) {
          Logger.error(
            'Error syncing audio player:',
            {
              eventId: event.id,
              eventName: event.name,
              error: error
            },
            '📺 EventMonitor'
          );
        }
      };

      sync();
    }, [
      event.isPlaying,
      isHost,
      audioPlayer,
      previewUrl,
      isEventEnded,
      event.id,
      event.name
    ]);

    // Get next track from queue (already sorted by voteCount)
    // queueTracks comes already sorted: voteCount DESC
    const getNextTrack = useCallback(
      (excludeTrackId?: string) => {
        // Tracks are already sorted by votes, just take first (or second if excluding current)
        if (queueTracks.length === 0) return null;

        if (excludeTrackId) {
          // If need to exclude current track, take next one
          const nextTrack = queueTracks.find(
            (t) => t.trackId !== excludeTrackId
          );
          return nextTrack || null;
        }

        // Take first track from already sorted queue
        return queueTracks[0];
      },
      [queueTracks]
    );

    // Auto-finish when track ends and start next track
    useEffect(() => {
      if (
        !isHost ||
        !user ||
        !currentTrack ||
        !audioPlayer ||
        !previewUrl ||
        isEventEnded
      ) {
        return;
      }

      const checkInterval = setInterval(() => {
        const status = audioPlayer.currentStatus;

        // Reset flags if track is not finished
        if (!status?.didJustFinish) {
          if (didFinishHandledRef.current || isProcessingFinishRef.current) {
            didFinishHandledRef.current = false;
            isProcessingFinishRef.current = false;
          }
          return;
        }

        // Already handled or currently processing - prevent duplicate processing
        if (didFinishHandledRef.current || isProcessingFinishRef.current) {
          return;
        }

        // Verify this is the correct track that finished
        if (currentTrackIdRef.current !== currentTrack.trackId) {
          return;
        }

        // Mark as handled and processing
        didFinishHandledRef.current = true;
        isProcessingFinishRef.current = true;

        Logger.info(
          'Track finished, starting next...',
          {
            eventId: event.id,
            eventName: event.name,
            currentTrackId: currentTrack.trackId,
            queueLength: queueTracks.length
          },
          '📺 EventMonitor'
        );

        const processFinish = async () => {
          try {
            // Add current track to finished list
            finishedTracksRef.current.add(currentTrack.trackId);

            // Get next track BEFORE finishing current
            // Exclude: current track + all already finished tracks
            const nextTrack =
              queueTracks.find(
                (t) =>
                  t.trackId !== currentTrack.trackId &&
                  !finishedTracksRef.current.has(t.trackId)
              ) || null;

            Logger.info(
              'Selected next track',
              { event: event.name },
              '📺 EventMonitor'
            );

            await EventService.finishTrack(event.id, user.uid);

            // Start next track if available
            if (nextTrack) {
              await EventService.startTrackPlayback(
                event.id,
                nextTrack,
                user.uid
              );
              Logger.info(
                'Auto-started next track',
                {
                  eventId: event.id,
                  eventName: event.name,
                  trackId: nextTrack.trackId,
                  title: nextTrack.track.title,
                  voteCount: nextTrack.voteCount
                },
                '📺 EventMonitor'
              );
            } else {
              Logger.info(
                'No more tracks in queue, playback stopped',
                {
                  event: event.name
                },
                '📺 EventMonitor'
              );
              // Clear finished tracks list when queue is empty
              finishedTracksRef.current.clear();
            }
          } catch (error) {
            Logger.error(
              'Error finishing track:',
              { eventId: event.id, eventName: event.name, error: error },
              '📺 EventMonitor'
            );
          } finally {
            isProcessingFinishRef.current = false;
          }
        };

        processFinish();
      }, 500); // Check every 500ms

      return () => clearInterval(checkInterval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      isHost,
      event.id,
      user,
      currentTrack,
      queueTracks,
      audioPlayer,
      previewUrl,
      isEventEnded
    ]);

    const handlePlayPause = useCallback(async () => {
      if (!user) return;

      // Check if event has ended - no playback control allowed
      if (isEventEnded) {
        Alert.show({
          title: 'Event Ended',
          message:
            'This event has ended. Playback control is no longer available.',
          buttons: [
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        });
        return;
      }

      // Check if event has started before allowing playback
      if (!hasEventStarted && !currentTrack) {
        Alert.show({
          title: 'Event Not Started',
          message:
            'The event has not started yet. You need to wait for the scheduled start time or start the event early.',
          buttons: [
            {
              text: 'Wait',
              style: 'cancel'
            },
            ...(onStartEventEarly
              ? [
                  {
                    text: 'Start Event Now',
                    style: 'default' as const,
                    onPress: onStartEventEarly
                  }
                ]
              : [])
          ]
        });
        return;
      }

      try {
        // If no track is playing, start the first track from queue
        if (!currentTrack) {
          const nextTrack = getNextTrack();
          if (!nextTrack) {
            Notifier.shoot({
              type: 'warn',
              title: 'No tracks in queue',
              message: 'Add some tracks to start playing'
            });
            return;
          }
          await EventService.startTrackPlayback(event.id, nextTrack, user.uid);
          Notifier.shoot({
            type: 'success',
            title: 'Playback started',
            message: `Now playing: ${nextTrack.track.title}`
          });
        } else {
          // Toggle pause/resume for current track
          if (event.isPlaying) {
            await EventService.pausePlayback(event.id, user.uid);
          } else {
            await EventService.resumePlayback(event.id, user.uid);
          }
        }
      } catch (error) {
        Logger.error(
          'Error toggling playback:',
          { eventId: event.id, eventName: event.name, error: error },
          '📺 EventMonitor'
        );
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: 'Failed to toggle playback'
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      event.id,
      event.isPlaying,
      user,
      currentTrack,
      getNextTrack,
      hasEventStarted,
      isEventEnded,
      onStartEventEarly
    ]);

    return (
      <View
        className="overflow-hidden rounded-lg border"
        style={{
          backgroundColor: `${themeColors[theme]['primary']}20`,
          borderColor: currentTrack
            ? themeColors[theme]['primary']
            : themeColors[theme]['border'],
          minHeight: 80 // Fixed height
        }}
      >
        <View className="flex-row items-center gap-3 p-4">
          {/* Loading or no track state */}
          {!currentTrack || isLoadingPreview ? (
            <>
              <View
                className="h-16 w-16 items-center justify-center rounded"
                style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
              >
                {isLoadingPreview ? (
                  <ActivityIndicator
                    size="small"
                    color={themeColors[theme]['primary']}
                  />
                ) : (
                  <Image
                    source={require('@/assets/images/logo/logo-heart-transparent.png')}
                    style={{
                      width: 48,
                      height: 48,
                      opacity: 0.6,
                      resizeMode: 'contain'
                    }}
                  />
                )}
              </View>
              <View className="flex-1">
                <TextCustom type="semibold">
                  {isLoadingPreview ? 'Loading track...' : 'Event Monitor'}
                </TextCustom>
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  {queueTracks.length > 0
                    ? `${queueTracks.length} track(s) in queue`
                    : 'No tracks in queue'}
                </TextCustom>
                {/* Third line spacer to maintain consistent height */}
                <TextCustom
                  size="xs"
                  color={themeColors[theme]['text-secondary']}
                  style={{ opacity: 0 }}
                >
                  {' '}
                </TextCustom>
              </View>
              {isHost && queueTracks.length > 0 && !currentTrack && (
                <IconButton
                  accessibilityLabel="Start playback"
                  onPress={handlePlayPause}
                  className="h-12 w-12"
                  backgroundColor={themeColors[theme]['primary']}
                >
                  <MaterialCommunityIcons
                    name="play"
                    size={24}
                    color={themeColors[theme]['text-inverse']}
                  />
                </IconButton>
              )}
            </>
          ) : (
            <>
              {/* Album cover */}
              {currentTrack.albumCover ? (
                <Image
                  source={{ uri: currentTrack.albumCover }}
                  className="h-16 w-16 rounded"
                />
              ) : (
                <View
                  className="h-16 w-16 items-center justify-center rounded"
                  style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
                >
                  <MaterialCommunityIcons
                    name="music"
                    size={32}
                    color={themeColors[theme]['text-secondary']}
                  />
                </View>
              )}

              {/* Track info */}
              <View className="flex-1">
                <View className="flex-row items-center gap-1">
                  {currentTrack.explicitLyrics && (
                    <MaterialCommunityIcons
                      name="alpha-e-box"
                      size={14}
                      color={themeColors[theme]['intent-warning']}
                    />
                  )}
                  <TextCustom
                    type="bold"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ flex: 1 }}
                  >
                    {currentTrack.title}
                  </TextCustom>
                </View>
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentTrack.artist}
                </TextCustom>
                <TextCustom
                  size="xs"
                  color={
                    event.isPlaying && !isEventEnded
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['intent-warning']
                  }
                  type="semibold"
                >
                  {isEventEnded
                    ? 'Ended'
                    : event.isPlaying
                      ? 'Currently playing'
                      : 'Paused'}
                </TextCustom>
              </View>

              {/* Play/Pause button - only for hosts */}
              {isHost && (
                <IconButton
                  accessibilityLabel={
                    event.isPlaying ? 'Pause playback' : 'Resume playback'
                  }
                  onPress={handlePlayPause}
                  className="h-12 w-12"
                  backgroundColor={themeColors[theme]['primary']}
                  disabled={!previewUrl}
                >
                  <MaterialCommunityIcons
                    name={event.isPlaying ? 'pause' : 'play'}
                    size={24}
                    color={themeColors[theme]['text-inverse']}
                  />
                </IconButton>
              )}
            </>
          )}
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo to prevent unnecessary re-renders
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.event.isPlaying === nextProps.event.isPlaying &&
      prevProps.currentTrack?.trackId === nextProps.currentTrack?.trackId &&
      prevProps.isHost === nextProps.isHost &&
      prevProps.hasEventStarted === nextProps.hasEventStarted &&
      prevProps.isEventEnded === nextProps.isEventEnded &&
      prevProps.queueTracks.length === nextProps.queueTracks.length &&
      prevProps.queueTracks.every(
        (track, index) =>
          track.trackId === nextProps.queueTracks[index]?.trackId &&
          track.voteCount === nextProps.queueTracks[index]?.voteCount
      )
    );
  }
);

EventMonitor.displayName = 'EventMonitor';

export default EventMonitor;

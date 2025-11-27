import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { useFocusEffect, useRouter } from 'expo-router';
import { useClient } from 'urql';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { GET_TRACK } from '@/graphql/queries';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
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
    const router = useRouter();
    const urqlClient = useClient();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isListening, setIsListening] = useState(false); // For participants only
    const didFinishHandledRef = useRef(false);
    const isProcessingFinishRef = useRef(false);
    const currentTrackIdRef = useRef<string | null>(null);
    const finishedTracksRef = useRef<Set<string>>(new Set());
    const isMountedRef = useRef(true);
    const wasPausedByBlurRef = useRef(false); // Track if pause was due to blur

    // Audio player for host OR listening participants
    const shouldUseAudioPlayer = isHost || (!isHost && isListening);
    const audioPlayer = useAudioPlayer(
      shouldUseAudioPlayer && previewUrl ? { uri: previewUrl } : undefined
    );

    // Refs for useFocusEffect to avoid recreating callback
    const isHostRef = useRef(isHost);
    const userRef = useRef(user);
    const eventIdRef = useRef(event.id);
    const isPlayingRef = useRef(event.isPlaying);
    const audioPlayerRef = useRef(audioPlayer);
    const routerRef = useRef(router);
    const currentTrackRef = useRef(currentTrack);
    const isEventEndedRef = useRef(isEventEnded);

    // Update refs when values change
    useEffect(() => {
      isHostRef.current = isHost;
      userRef.current = user;
      eventIdRef.current = event.id;
      isPlayingRef.current = event.isPlaying;
      audioPlayerRef.current = audioPlayer;
      routerRef.current = router;
      currentTrackRef.current = currentTrack;
      isEventEndedRef.current = isEventEnded;
    }, [
      isHost,
      user,
      event.id,
      event.isPlaying,
      audioPlayer,
      router,
      currentTrack,
      isEventEnded
    ]);

    // Load listening state from AsyncStorage for participants
    useEffect(() => {
      if (isHost) return; // Hosts don't need this

      const loadListeningState = async () => {
        try {
          const storageKey = `event_listening_${event.id}`;
          const stored = await AsyncStorage.getItem(storageKey);
          if (stored !== null) {
            setIsListening(stored === 'true');
          }
          // Default is false (already set in useState)
        } catch (error) {
          Logger.error(
            'Error loading listening state:',
            { eventId: event.id, eventName: event.name, error: error },
            '📺 EventMonitor'
          );
        }
      };

      loadListeningState();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event.id, isHost]);

    // Save listening state to AsyncStorage when it changes
    useEffect(() => {
      if (isHost) return; // Hosts don't need this

      const saveListeningState = async () => {
        try {
          const storageKey = `event_listening_${event.id}`;
          await AsyncStorage.setItem(storageKey, isListening.toString());
        } catch (error) {
          Logger.error(
            'Error saving listening state:',
            { eventId: event.id, eventName: event.name, error: error },
            '📺 EventMonitor'
          );
        }
      };

      saveListeningState();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening, event.id, isHost]);

    // Handle screen focus/blur - immediate pause for host
    useFocusEffect(
      useCallback(() => {
        // Screen is focused
        isMountedRef.current = true;

        const currentIsHost = isHostRef.current;
        const currentUser = userRef.current;
        const currentEventId = eventIdRef.current;

        // Auto-resume playback for host if it was paused due to blur
        if (currentIsHost && wasPausedByBlurRef.current && currentUser) {
          setTimeout(() => {
            const currentCurrentTrack = currentTrackRef.current;
            // Check if there's a current track
            if (currentCurrentTrack) {
              EventService.resumePlayback(currentEventId, currentUser.uid)
                .then(() => {
                  wasPausedByBlurRef.current = false;
                })
                .catch((error) => {
                  Logger.error(
                    'Error auto-resuming playback:',
                    {
                      eventId: currentEventId,
                      eventName: event.name,
                      error: error
                    },
                    '📺 EventMonitor'
                  );
                });
            }
          }, 100);
        }

        return () => {
          // Screen lost focus (blur)
          isMountedRef.current = false;

          const currentEventId = eventIdRef.current;
          const currentIsHost = isHostRef.current;
          const currentUser = userRef.current;
          const currentIsPlaying = isPlayingRef.current;
          const currentAudioPlayer = audioPlayerRef.current;
          const hadPreviousAutoResume = wasPausedByBlurRef.current;

          // If there was a previous auto-resume flag set, it means user didn't return
          // Clear it before setting new one
          if (hadPreviousAutoResume) wasPausedByBlurRef.current = false;

          // Reset finish handlers to prevent stale finish events
          didFinishHandledRef.current = false;
          isProcessingFinishRef.current = false;

          // Stop local audio player immediately
          if (currentAudioPlayer) {
            try {
              currentAudioPlayer.pause();
              Logger.info(
                'Local audio paused on blur',
                { eventId: currentEventId },
                '📺 EventMonitor'
              );
            } catch {
              // Silently ignore errors
            }
          }

          const currentIsEventEnded = isEventEndedRef.current;

          // Skip alerts and pause logic if event has ended
          if (currentIsEventEnded) {
            Logger.info(
              'Skipping blur pause - event has ended',
              { eventId: currentEventId },
              '📺 EventMonitor'
            );
            return;
          }

          // Show alert for host only
          if (currentIsHost && currentIsPlaying) {
            setTimeout(() => {
              const currentRouter = routerRef.current;

              Alert.confirm(
                'You left the event',
                'Music playback has been paused for all event participants. Do you want to return to the event?',
                () => {
                  // User wants to return
                  currentRouter.push(`/events/${currentEventId}`);
                },
                () => {
                  // User chose not to return - clear auto-resume flag
                  wasPausedByBlurRef.current = false;
                }
              );
            }, 300);
          }

          // For host: pause playback in database immediately
          if (currentIsHost && currentUser && currentIsPlaying) {
            // Mark that pause was due to blur (for auto-resume on return)
            wasPausedByBlurRef.current = true;

            EventService.pausePlayback(currentEventId, currentUser.uid)
              .then(() => {
                Logger.info(
                  'Paused playback immediately on blur',
                  { eventId: currentEventId },
                  '📺 EventMonitor'
                );
              })
              .catch((error) => {
                Logger.error(
                  'Error pausing playback on blur:',
                  { eventId: currentEventId, error: error },
                  '📺 EventMonitor'
                );
              });
          }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
    );

    // Cleanup on unmount (real unmount, not just blur)
    useEffect(() => {
      return () => {
        // Clear auto-resume flag on unmount
        wasPausedByBlurRef.current = false;
      };
    }, [event.id]);

    // Load preview URL for host OR listening participants (only when track changes)
    useEffect(() => {
      const shouldLoadPreview = isHost || (!isHost && isListening);

      if (!shouldLoadPreview || !currentTrack?.trackId) {
        setPreviewUrl(null);
        currentTrackIdRef.current = null;
        return;
      }

      // Reset finish handlers when track changes
      if (currentTrackIdRef.current !== currentTrack.trackId) {
        // Clear auto-resume flag when track changes
        wasPausedByBlurRef.current = false;

        // IMPORTANT: First stop audio player and reset state
        const stopAndLoad = async () => {
          if (audioPlayer) {
            try {
              await audioPlayer.pause();
            } catch {
              // Silently ignore
            }
          }

          didFinishHandledRef.current = false;
          isProcessingFinishRef.current = false;
          setPreviewUrl(null); // Reset preview before loading new one

          // Wait a bit for old player to fully stop
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Then set new track ID
          currentTrackIdRef.current = currentTrack.trackId;

          // Load new preview
          setIsLoadingPreview(true);
          try {
            const result = await urqlClient
              .query(GET_TRACK, { id: currentTrack.trackId })
              .toPromise();

            const track = result?.data?.track;
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

        stopAndLoad();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTrack?.trackId, isHost, isListening]);

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

    // Stop audio player immediately when event ends (for all users)
    useEffect(() => {
      if (!audioPlayer || !isEventEnded) return;

      const stopPlayback = async () => {
        try {
          await audioPlayer.pause();
          Logger.info(
            'Audio player stopped: event ended',
            { eventId: event.id, eventName: event.name, isHost },
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
    }, [isEventEnded, audioPlayer, event.id, event.name, isHost]);

    // Sync audio player with isPlaying state (for host and listening participants)
    useEffect(() => {
      const shouldSync = isHost || (!isHost && isListening);
      if (!shouldSync || !audioPlayer || !previewUrl || isEventEnded) return;

      // Only sync if component is in focus
      if (!isMountedRef.current) return;

      const sync = async () => {
        try {
          // Check current player status to avoid duplicate play/pause
          const currentStatus = audioPlayer.currentStatus;
          const isCurrentlyPlaying = currentStatus?.playing ?? false;

          if (event.isPlaying) {
            // Event should be playing - start if not already playing
            if (!isCurrentlyPlaying) {
              await audioPlayer.play();
            }
            // If already playing - do nothing
          } else {
            // Event is paused - stop if currently playing
            if (isCurrentlyPlaying) {
              await audioPlayer.pause();
            }
            // If already paused - do nothing
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
      isListening,
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
        // Check if component is in focus before processing
        if (!isMountedRef.current) {
          return;
        }

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

        const processFinish = async () => {
          try {
            // Check if component is still in focus
            if (!isMountedRef.current) {
              isProcessingFinishRef.current = false;
              return;
            }

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

            // Check focus again before Firebase operations
            if (!isMountedRef.current) {
              isProcessingFinishRef.current = false;
              return;
            }

            await EventService.finishTrack(event.id, user.uid);

            // Start next track if available and still in focus
            if (nextTrack && isMountedRef.current) {
              await EventService.startTrackPlayback(
                event.id,
                nextTrack,
                user.uid
              );
            } else {
              // Clear finished tracks list when queue is empty
              finishedTracksRef.current.clear();
            }
          } catch (error: any) {
            // Silently ignore "Track not found in queue" errors when component is not focused
            const isTrackNotFoundError = error?.message?.includes(
              'Track not found in queue'
            );
            if (isTrackNotFoundError && !isMountedRef.current) {
              Logger.info(
                'Track not found (component lost focus)',
                { eventId: event.id, trackId: currentTrack.trackId },
                '📺 EventMonitor'
              );
            } else {
              Logger.error(
                'Error finishing track:',
                { eventId: event.id, eventName: event.name, error: error },
                '📺 EventMonitor'
              );
            }
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
            // Manual pause - clear auto-resume flag
            wasPausedByBlurRef.current = false;
          } else {
            await EventService.resumePlayback(event.id, user.uid);
            // Manual resume - clear auto-resume flag
            wasPausedByBlurRef.current = false;
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

    // Handler for participant listening toggle
    const handleToggleListening = useCallback(() => {
      setIsListening((prev) => {
        const newValue = !prev;

        // If stopping listening, pause the audio player immediately
        if (!newValue && audioPlayer) {
          try {
            audioPlayer.pause();
          } catch {
            // Silently ignore
          }
        }

        Logger.info(
          'Listening toggled',
          {
            eventId: event.id,
            eventName: event.name,
            userId: user?.uid,
            listening: newValue
          },
          '📺 EventMonitor'
        );

        return newValue;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioPlayer, event.id]);

    return (
      <View>
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
          <View className="flex-row items-center gap-3 px-4 py-2">
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
                {!isEventEnded &&
                  isHost &&
                  queueTracks.length > 0 &&
                  !currentTrack && (
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
                    style={{
                      backgroundColor: themeColors[theme]['bg-tertiary']
                    }}
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

                {/* Control buttons - different for hosts and participants */}
                {!isEventEnded && isHost && (
                  /* Host: Play/Pause button */
                  <IconButton
                    accessibilityLabel={
                      event.isPlaying ? 'Pause playback' : 'Resume playback'
                    }
                    onPress={handlePlayPause}
                    className="h-12 w-12"
                    backgroundColor={themeColors[theme]['primary']}
                    disabled={!previewUrl}
                  >
                    <Ionicons
                      name={event.isPlaying ? 'pause' : 'play'}
                      size={24}
                      color={themeColors[theme]['text-inverse']}
                    />
                  </IconButton>
                )}
                {!isEventEnded && !isHost && isListening && (
                  /* Participant: Listening toggle button (active) */
                  <IconButton
                    accessibilityLabel={'Stop listening'}
                    onPress={handleToggleListening}
                    className="h-12 w-12 animate-pulse"
                    backgroundColor={themeColors[theme]['intent-success']}
                  >
                    <MaterialCommunityIcons
                      name={'broadcast'}
                      size={24}
                      color={themeColors[theme]['text-inverse']}
                    />
                  </IconButton>
                )}
                {!isEventEnded && !isHost && !isListening && (
                  /* Participant: Listening toggle button (inactive) */
                  <IconButton
                    accessibilityLabel={'Start listening'}
                    onPress={handleToggleListening}
                    className="h-12 w-12"
                    backgroundColor={themeColors[theme]['bg-tertiary']}
                  >
                    <MaterialCommunityIcons
                      name={'broadcast-off'}
                      size={24}
                      color={themeColors[theme]['text-secondary']}
                    />
                  </IconButton>
                )}
              </>
            )}
          </View>
        </View>
        {isHost && !isEventEnded ? (
          <TextCustom
            size="xs"
            color={themeColors[theme]['intent-warning']}
            className="text-center"
          >
            ⚠️ If you leave the event tab, music will be paused for all
            participants.
          </TextCustom>
        ) : null}
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

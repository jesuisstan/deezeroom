import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import ProgressBar from '@/components/player/ProgressBar';
import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
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
}

const EventMonitor = ({
  event,
  currentTrack,
  isHost,
  queueTracks
}: EventMonitorProps) => {
  const { theme } = useTheme();
  const { user } = useUser();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const didFinishHandledRef = useRef(false);
  const isProcessingFinishRef = useRef(false);

  // Audio player for host only
  const audioPlayer = useAudioPlayer(
    isHost && previewUrl ? { uri: previewUrl } : undefined
  );

  // Audio status for the player
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  // Load preview URL for host
  useEffect(() => {
    if (!isHost || !currentTrack?.trackId) {
      setPreviewUrl(null);
      return;
    }

    // Reset finish handler when track changes
    didFinishHandledRef.current = false;
    isProcessingFinishRef.current = false;

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const deezerService = DeezerService.getInstance();
        const track = await deezerService.getTrackById(currentTrack.trackId);
        setPreviewUrl(track?.preview || null);
      } catch (error) {
        Logger.error('Error loading track preview:', error);
        setPreviewUrl(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [currentTrack?.trackId, isHost]);

  // Sync audio player with isPlaying state
  useEffect(() => {
    if (!isHost || !audioPlayer || !previewUrl) return;

    const sync = async () => {
      try {
        if (event.isPlaying) {
          await audioPlayer.play();
        } else {
          await audioPlayer.pause();
        }
      } catch (error) {
        Logger.error('Error syncing audio player:', error);
      }
    };

    sync();
  }, [event.isPlaying, isHost, audioPlayer, previewUrl]);

  // Get next track from queue (highest voteCount)
  const getNextTrack = useCallback(
    (excludeTrackId?: string) => {
      const availableTracks = excludeTrackId
        ? queueTracks.filter((t) => t.trackId !== excludeTrackId)
        : queueTracks;

      if (availableTracks.length === 0) return null;

      // Sort by voteCount descending, then by addedAt ascending
      const sorted = [...availableTracks].sort((a, b) => {
        if (b.voteCount !== a.voteCount) {
          return b.voteCount - a.voteCount;
        }
        return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      });
      return sorted[0];
    },
    [queueTracks]
  );

  // Auto-finish when track ends and start next track
  useEffect(() => {
    if (!isHost || !user || !currentTrack || !audioStatus) return;

    // Reset flag if track is not finished
    if (!audioStatus.didJustFinish) {
      didFinishHandledRef.current = false;
      return;
    }

    // Already handled or currently processing
    if (didFinishHandledRef.current || isProcessingFinishRef.current) {
      return;
    }

    // Mark as handled and processing
    didFinishHandledRef.current = true;
    isProcessingFinishRef.current = true;

    Logger.info('Track finished, starting next...', {
      currentTrackId: currentTrack.trackId
    });

    const processFinish = async () => {
      try {
        // Get next track BEFORE finishing current (to avoid race condition)
        const nextTrack = getNextTrack(currentTrack.trackId);

        await EventService.finishTrack(event.id, user.uid);

        // Start next track if available
        if (nextTrack) {
          await EventService.startTrackPlayback(event.id, nextTrack, user.uid);
          Logger.info('Auto-started next track', {
            trackId: nextTrack.trackId,
            title: nextTrack.track.title
          });
        } else {
          Logger.info('No more tracks in queue, playback stopped');
        }
      } catch (error) {
        Logger.error('Error checking track end:', error);
      } finally {
        isProcessingFinishRef.current = false;
      }
    };

    processFinish();
  }, [isHost, event.id, user, currentTrack, audioStatus, getNextTrack]);

  const handlePlayPause = useCallback(async () => {
    if (!user) return;

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
      Logger.error('Error toggling playback:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to toggle playback'
      });
    }
  }, [event.id, event.isPlaying, user, currentTrack, getNextTrack]);

  const handleSkip = useCallback(async () => {
    if (!user || !currentTrack) return;

    try {
      // Get next track BEFORE skipping current (to avoid race condition)
      const nextTrack = getNextTrack(currentTrack.trackId);

      await EventService.skipTrack(event.id, user.uid);

      // Start next track if available
      if (nextTrack) {
        await EventService.startTrackPlayback(event.id, nextTrack, user.uid);
        Notifier.shoot({
          type: 'info',
          title: 'Track skipped',
          message: `Now playing: ${nextTrack.track.title}`
        });
      } else {
        Notifier.shoot({
          type: 'info',
          title: 'Track skipped',
          message: 'No more tracks in queue'
        });
      }
    } catch (error) {
      Logger.error('Error skipping track:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to skip track'
      });
    }
  }, [event.id, user, currentTrack, getNextTrack]);

  // If no current track, show simple play button for hosts
  if (!currentTrack) {
    if (!isHost) return null;

    return (
      <View
        className="mb-4 overflow-hidden rounded-lg border"
        style={{
          backgroundColor: themeColors[theme]['bg-secondary'],
          borderColor: themeColors[theme]['border']
        }}
      >
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-1">
            <TextCustom type="semibold">Event Playback</TextCustom>
            <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
              {queueTracks.length > 0
                ? `${queueTracks.length} track(s) in queue`
                : 'No tracks in queue'}
            </TextCustom>
          </View>
          {queueTracks.length > 0 && (
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
        </View>
      </View>
    );
  }

  return (
    <View
      className="mb-4 overflow-hidden rounded-lg border"
      style={{
        backgroundColor: themeColors[theme]['primary'] + '20',
        borderColor: themeColors[theme]['primary']
      }}
    >
      <View className="p-4">
        {/* Track info */}
        <View className="mb-3 flex-row items-center gap-3">
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

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              {currentTrack.explicitLyrics && (
                <MaterialCommunityIcons
                  name="alpha-e-box"
                  size={16}
                  color={themeColors[theme]['intent-warning']}
                />
              )}
              <TextCustom
                type="bold"
                size="l"
                numberOfLines={1}
                ellipsizeMode="tail"
                className="flex-shrink"
              >
                {currentTrack.title}
              </TextCustom>
            </View>
            <TextCustom
              size="m"
              color={themeColors[theme]['text-secondary']}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {currentTrack.artist}
            </TextCustom>
          </View>
        </View>

        {/* Progress bar - только для хоста */}
        {isHost && previewUrl && !isLoadingPreview && (
          <View className="mb-3">
            <ProgressBar
              theme={theme}
              trackDuration={currentTrack.duration}
              layout="stacked"
            />
          </View>
        )}

        {/* Host controls */}
        {isHost ? (
          <View className="flex-row items-center justify-center gap-2">
            <IconButton
              accessibilityLabel={
                event.isPlaying ? 'Pause playback' : 'Resume playback'
              }
              onPress={handlePlayPause}
              className="h-12 w-12"
              backgroundColor={themeColors[theme]['primary']}
              disabled={isLoadingPreview || !previewUrl}
            >
              <MaterialCommunityIcons
                name={event.isPlaying ? 'pause' : 'play'}
                size={24}
                color={themeColors[theme]['text-inverse']}
              />
            </IconButton>
            <IconButton
              accessibilityLabel="Skip to next track"
              onPress={handleSkip}
              className="h-12 w-12"
            >
              <MaterialCommunityIcons
                name="skip-next"
                size={24}
                color={themeColors[theme]['text-main']}
              />
            </IconButton>
          </View>
        ) : (
          <View className="items-center">
            <TextCustom
              size="s"
              color={themeColors[theme]['text-secondary']}
              className="text-center"
            >
              {event.isPlaying ? 'Now playing by host' : 'Paused by host'}
            </TextCustom>
          </View>
        )}
      </View>
    </View>
  );
};

export default EventMonitor;

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';

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
  const currentTrackIdRef = useRef<string | null>(null);
  const finishedTracksRef = useRef<Set<string>>(new Set());

  // Audio player for host only
  const audioPlayer = useAudioPlayer(
    isHost && previewUrl ? { uri: previewUrl } : undefined
  );

  // Audio status for the player
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  // Load preview URL for host (only when track changes)
  useEffect(() => {
    if (!isHost || !currentTrack?.trackId) {
      setPreviewUrl(null);
      currentTrackIdRef.current = null;
      return;
    }

    // Reset finish handlers when track changes
    if (currentTrackIdRef.current !== currentTrack.trackId) {
      Logger.info('Track changed, resetting finish handlers', {
        oldTrack: currentTrackIdRef.current,
        newTrack: currentTrack.trackId
      });

      // ВАЖНО: Сначала сбрасываем флаги и preview URL
      didFinishHandledRef.current = false;
      isProcessingFinishRef.current = false;
      setPreviewUrl(null); // ← Сброс preview перед загрузкой нового

      // Затем устанавливаем новый track ID
      currentTrackIdRef.current = currentTrack.trackId;

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
    }
  }, [currentTrack?.trackId, isHost]);

  // Cleanup finished tracks when queue changes
  useEffect(() => {
    if (!currentTrack) return;

    // Очищаем старые завершенные треки, которых уже нет в очереди
    const currentTrackIds = new Set(queueTracks.map((t) => t.trackId));
    currentTrackIds.add(currentTrack.trackId); // Добавляем текущий трек

    const finishedToRemove: string[] = [];
    finishedTracksRef.current.forEach((trackId) => {
      if (!currentTrackIds.has(trackId)) {
        finishedToRemove.push(trackId);
      }
    });
    finishedToRemove.forEach((trackId) =>
      finishedTracksRef.current.delete(trackId)
    );

    if (finishedToRemove.length > 0) {
      Logger.debug('Cleaned up finished tracks', {
        removed: finishedToRemove,
        remaining: Array.from(finishedTracksRef.current)
      });
    }
  }, [queueTracks, currentTrack]);

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

  // Get next track from queue (already sorted by voteCount in Firestore)
  // queueTracks приходит уже отсортированным: voteCount DESC, addedAt ASC
  const getNextTrack = useCallback(
    (excludeTrackId?: string) => {
      // Треки уже отсортированы по голосам, просто берем первый (или второй если исключаем текущий)
      if (queueTracks.length === 0) return null;

      if (excludeTrackId) {
        // Если нужно исключить текущий трек, берем следующий
        const nextTrack = queueTracks.find((t) => t.trackId !== excludeTrackId);
        return nextTrack || null;
      }

      // Берем первый трек из уже отсортированной очереди
      return queueTracks[0];
    },
    [queueTracks]
  );

  // Auto-finish when track ends and start next track
  useEffect(() => {
    if (!isHost || !user || !currentTrack || !audioStatus) return;

    // ВАЖНО: Проверяем, что preview URL загружен для текущего трека
    // Иначе это может быть didJustFinish от предыдущего трека
    if (!previewUrl || isLoadingPreview) {
      return;
    }

    // Reset flags if track is not finished
    if (!audioStatus.didJustFinish) {
      if (didFinishHandledRef.current || isProcessingFinishRef.current) {
        Logger.debug('Resetting finish flags (didJustFinish = false)', {
          trackId: currentTrack.trackId
        });
        didFinishHandledRef.current = false;
        isProcessingFinishRef.current = false;
      }
      return;
    }

    // Already handled or currently processing - prevent duplicate processing
    if (didFinishHandledRef.current || isProcessingFinishRef.current) {
      Logger.debug('Finish already handled or processing, skipping', {
        trackId: currentTrack.trackId,
        handled: didFinishHandledRef.current,
        processing: isProcessingFinishRef.current
      });
      return;
    }

    // Verify this is the correct track that finished
    if (currentTrackIdRef.current !== currentTrack.trackId) {
      Logger.warn('Track ID mismatch in finish handler', {
        currentTrackId: currentTrack.trackId,
        expectedTrackId: currentTrackIdRef.current
      });
      return;
    }

    // Mark as handled and processing
    didFinishHandledRef.current = true;
    isProcessingFinishRef.current = true;

    Logger.info('Track finished, starting next...', {
      currentTrackId: currentTrack.trackId,
      queueLength: queueTracks.length
    });

    const processFinish = async () => {
      try {
        // Добавляем текущий трек в список завершенных
        finishedTracksRef.current.add(currentTrack.trackId);

        // Get next track BEFORE finishing current
        // Исключаем: текущий трек + все уже завершенные треки
        const nextTrack =
          queueTracks.find(
            (t) =>
              t.trackId !== currentTrack.trackId &&
              !finishedTracksRef.current.has(t.trackId)
          ) || null;

        Logger.info('Selected next track', {
          nextTrackId: nextTrack?.trackId,
          nextTrackTitle: nextTrack?.track.title,
          currentTrackId: currentTrack.trackId,
          finishedTracks: Array.from(finishedTracksRef.current),
          availableTracks: queueTracks.map((t) => t.trackId)
        });

        await EventService.finishTrack(event.id, user.uid);

        // Start next track if available
        if (nextTrack) {
          await EventService.startTrackPlayback(event.id, nextTrack, user.uid);
          Logger.info('Auto-started next track', {
            trackId: nextTrack.trackId,
            title: nextTrack.track.title,
            voteCount: nextTrack.voteCount
          });
        } else {
          Logger.info('No more tracks in queue, playback stopped');
          // Очищаем список завершенных треков когда очередь пуста
          finishedTracksRef.current.clear();
        }
      } catch (error) {
        Logger.error('Error finishing track:', error);
      } finally {
        isProcessingFinishRef.current = false;
      }
    };

    processFinish();
  }, [isHost, event.id, user, currentTrack, audioStatus, queueTracks]);

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

  // Fixed height container - always rendered to prevent layout jumps
  return (
    <View
      className="mb-4 overflow-hidden rounded-lg border"
      style={{
        backgroundColor: currentTrack
          ? themeColors[theme]['primary'] + '20'
          : themeColors[theme]['bg-secondary'],
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
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                {queueTracks.length > 0
                  ? `${queueTracks.length} track(s) in queue`
                  : 'No tracks in queue'}
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
                <MaterialCommunityIcons
                  name={event.isPlaying ? 'play-circle' : 'pause-circle'}
                  size={14}
                  color={
                    event.isPlaying
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
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
};

export default EventMonitor;

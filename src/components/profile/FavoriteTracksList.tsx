import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { useAudioPlayer } from 'expo-audio';
import { useClient } from 'urql';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import TrackCard from '@/components/search-tracks/TrackCard';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { LIMIT_DEFAULT } from '@/constants/deezer';
import { GET_TRACK } from '@/graphql/queries';
import { Track } from '@/graphql/schema';
import { useNetwork } from '@/providers/NetworkProvider';
import {
  usePlaybackActions,
  usePlaybackUI
} from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';

interface FavoriteTracksListProps {
  onPlayTrack?: (track: Track | null) => void;
  currentPlayingTrackId?: string;
  // Optional explicit list of track IDs to render favorites for another user
  trackIdsOverride?: string[];
}

const FavoriteTracksList: FC<FavoriteTracksListProps> = ({
  onPlayTrack,
  currentPlayingTrackId,
  trackIdsOverride
}) => {
  const { theme } = useTheme();
  const { profile } = useUser();
  const { isOnline } = useNetwork();
  const client = useClient();
  const { isPlaying: isGlobalPlaybackActive } = usePlaybackUI();
  const { pause: pauseGlobalPlayback } = usePlaybackActions();

  const [loadedTracks, setLoadedTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPreviewTrackId, setCurrentPreviewTrackId] = useState<
    string | null
  >(null);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string | null>(
    null
  );

  // Audio player for preview - recreated when URL changes
  const previewPlayer = useAudioPlayer(
    currentPreviewUrl ? { uri: currentPreviewUrl } : undefined
  );

  const favoriteTrackIds = useMemo(() => {
    if (trackIdsOverride && trackIdsOverride.length >= 0) {
      return trackIdsOverride;
    }
    return profile?.favoriteTracks || [];
  }, [trackIdsOverride, profile?.favoriteTracks]);
  const hasMore = currentIndex < favoriteTrackIds.length;

  // Load initial batch of tracks
  useEffect(() => {
    if (favoriteTrackIds.length === 0) {
      setLoadedTracks([]);
      setCurrentIndex(0);
      return;
    }

    loadTracksBatch(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteTrackIds.length]);

  // Load a batch of tracks by their IDs
  const loadTracksBatch = useCallback(
    async (startIndex: number, isInitialLoad = false) => {
      const endIndex = Math.min(
        startIndex + LIMIT_DEFAULT,
        favoriteTrackIds.length
      );
      const trackIdsToLoad = favoriteTrackIds.slice(startIndex, endIndex);

      if (trackIdsToLoad.length === 0) return;

      const loadingState = isInitialLoad ? setIsLoading : setIsLoadingMore;
      loadingState(true);

      try {
        Logger.info(
          'Loading favorite tracks batch',
          {
            startIndex,
            endIndex,
            trackIdsCount: trackIdsToLoad.length,
            totalFavorites: favoriteTrackIds.length
          },
          '❤️ FavoriteTracksList'
        );

        // Load tracks in parallel
        const trackPromises = trackIdsToLoad.map(async (trackId) => {
          try {
            // Use different cache policy based on network status
            const requestPolicy = !isOnline ? 'cache-only' : 'cache-first';

            const result = await client.query(
              GET_TRACK,
              { id: trackId },
              { requestPolicy }
            );
            return result.data?.track;
          } catch (error) {
            Logger.error(
              `Failed to load track ${trackId}:`,
              error,
              '❤️ FavoriteTracksList'
            );
            return null;
          }
        });

        const tracks = await Promise.all(trackPromises);
        const validTracks = tracks.filter(
          (track): track is Track => track !== null
        );

        if (isInitialLoad) {
          setLoadedTracks(validTracks);
        } else {
          setLoadedTracks((prev) => [...prev, ...validTracks]);
        }

        setCurrentIndex(endIndex);

        if (validTracks.length < trackIdsToLoad.length) {
          Notifier.warn(
            `Some tracks could not be loaded (${trackIdsToLoad.length - validTracks.length} failed)`
          );
        }
      } catch (error) {
        Logger.error(
          'Error loading favorite tracks batch:',
          error,
          '❤️ FavoriteTracksList'
        );
        Notifier.error('Failed to load favorite tracks');
      } finally {
        loadingState(false);
      }
    },
    [favoriteTrackIds, client, isOnline]
  );

  // Load more tracks when scrolling
  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    loadTracksBatch(currentIndex, false);
  }, [hasMore, isLoadingMore, isLoading, currentIndex, loadTracksBatch]);

  const handlePlayTrack = useCallback(
    async (track: Track) => {
      if (!track.preview) {
        Notifier.warn('Preview is not available for this track');
        return;
      }

      // Toggle pause if tapping the same track
      if (currentPreviewTrackId === track.id) {
        try {
          previewPlayer.pause();
          setCurrentPreviewTrackId(null);
          setCurrentPreviewUrl(null);
          onPlayTrack?.(null);
        } catch (error) {
          Logger.error('Error stopping preview:', error);
        }
        return;
      }

      try {
        if (isGlobalPlaybackActive) {
          pauseGlobalPlayback();
        }

        // Stop any current preview
        if (currentPreviewTrackId) {
          await previewPlayer.pause();
        }
        // Set new preview URL and start later via effect
        setCurrentPreviewUrl(track.preview);
        setCurrentPreviewTrackId(track.id);
        onPlayTrack?.(track);
        // Notify parent about selected track (optional)
        onPlayTrack?.(track);
      } catch (error) {
        Logger.error('Error playing preview:', error);
        Notifier.warn('Failed to play preview');
        setCurrentPreviewTrackId(null);
        setCurrentPreviewUrl(null);
        onPlayTrack?.(null);
      }
    },
    [
      currentPreviewTrackId,
      isGlobalPlaybackActive,
      onPlayTrack,
      pauseGlobalPlayback,
      previewPlayer
    ]
  );

  // Auto-play when preview URL changes
  useEffect(() => {
    if (currentPreviewTrackId && currentPreviewUrl && previewPlayer) {
      const playPreview = async () => {
        try {
          await previewPlayer.play();
        } catch (error) {
          Logger.error('Error auto-playing preview:', error);
        }
      };
      const timeoutId = setTimeout(playPreview, 50);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPreviewUrl, currentPreviewTrackId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        previewPlayer.pause();
      } catch {
        // ignore
      }
    };
  }, []);

  if (favoriteTrackIds.length === 0) {
    return (
      <View className="items-center py-8">
        <TextCustom
          size="s"
          color={themeColors[theme]['text-secondary']}
          className="text-center"
        >
          No favorite tracks yet
        </TextCustom>
        <TextCustom
          size="xs"
          color={themeColors[theme]['text-secondary']}
          className="mt-2 text-center"
        >
          Add tracks to your favorites from the search results
        </TextCustom>
      </View>
    );
  }

  return (
    <View className="w-full">
      {/* Offline indicator */}
      {!isOnline && (
        <View className="rounded-lg bg-bg-secondary p-4">
          <TextCustom color={themeColors[theme]['intent-warning']}>
            Offline mode - showing cached favorite tracks only
          </TextCustom>
        </View>
      )}

      <View className="flex-row items-center justify-between px-4 py-4">
        <TextCustom type="semibold" size="xl">
          Favorite Tracks{' '}
          <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
            ({loadedTracks.length} of {favoriteTrackIds.length})
          </TextCustom>
        </TextCustom>
      </View>

      {loadedTracks.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 400 }}
          nestedScrollEnabled
          removeClippedSubviews={true}
        >
          {loadedTracks.map((track, index) => {
            const activeId = currentPlayingTrackId ?? currentPreviewTrackId;
            return (
              <TrackCard
                key={`${track.id}-${index}`}
                track={track}
                isPlaying={activeId === track.id}
                onPress={handlePlayTrack}
              />
            );
          })}
        </ScrollView>
      )}

      {/* Load more button */}
      {hasMore && (
        <View className="items-center gap-2 px-4 py-4">
          <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
            Loaded {loadedTracks.length} of {favoriteTrackIds.length} tracks
          </TextCustom>
          <RippleButton
            title="Load more"
            size="sm"
            onPress={handleLoadMore}
            loading={isLoadingMore}
            width={120}
          />
        </View>
      )}

      {/* End of list indicator */}
      {!hasMore && loadedTracks.length > 0 && (
        <View className="items-center px-4 py-4">
          <TextCustom
            size="xs"
            color={themeColors[theme]['text-secondary']}
            className="text-center"
          >
            All favorite tracks loaded
          </TextCustom>
        </View>
      )}

      {/* Loading state */}
      {isLoading && (
        <View className="items-center py-4">
          <ActivityIndicator color={themeColors[theme]['primary']} />
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="mt-2"
          >
            Loading favorite tracks...
          </TextCustom>
        </View>
      )}
    </View>
  );
};

export default FavoriteTracksList;

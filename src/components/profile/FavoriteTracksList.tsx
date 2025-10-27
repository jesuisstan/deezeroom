import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { useClient } from 'urql';

import TrackCard from '@/components/search-tracks/TrackCard';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { LIMIT_DEFAULT } from '@/constants/deezer';
import { GET_TRACK } from '@/graphql/queries';
import { Track } from '@/graphql/schema';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useNetwork } from '@/providers/NetworkProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';

interface FavoriteTracksListProps {
  onPlayTrack?: (track: Track) => void;
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

  const [loadedTracks, setLoadedTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

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
    (track: Track) => {
      onPlayTrack?.(track);
    },
    [onPlayTrack]
  );

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
        <View className="bg-intent-warning/10 mb-2 rounded-lg p-3">
          <TextCustom color={themeColors[theme]['intent-warning']}>
            Offline mode - showing cached favorite tracks only
          </TextCustom>
        </View>
      )}

      <View className="mb-2 flex-row items-center justify-between">
        <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
          Favorite Tracks ({loadedTracks.length} of {favoriteTrackIds.length})
        </TextCustom>
      </View>

      {loadedTracks.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 400 }}
          nestedScrollEnabled
          removeClippedSubviews={true}
        >
          {loadedTracks.map((track, index) => (
            <TrackCard
              key={`${track.id}-${index}`}
              track={track}
              isPlaying={currentPlayingTrackId === track.id}
              onPlay={handlePlayTrack}
            />
          ))}
        </ScrollView>
      )}

      {/* Load more button */}
      {hasMore && (
        <View className="mt-2 items-center">
          <TextCustom
            size="xs"
            color={themeColors[theme]['text-secondary']}
            className="mb-2"
          >
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
        <TextCustom
          size="xs"
          color={themeColors[theme]['text-secondary']}
          className="mt-2 text-center"
        >
          All favorite tracks loaded
        </TextCustom>
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

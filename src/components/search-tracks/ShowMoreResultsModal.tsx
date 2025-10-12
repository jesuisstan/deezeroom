import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { useQuery } from 'urql';

import TrackCard from '@/components/search-tracks/TrackCard';
import { TextCustom } from '@/components/ui/TextCustom';
import { SEARCH_TRACKS } from '@/graphql/queries';
import { Track } from '@/graphql/schema';
import { Logger } from '@/modules/logger/LoggerModule';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface ShowMoreResultsModalProps {
  searchQuery: string;
  onPlayTrack?: (track: Track) => void;
  currentPlayingTrackId?: string;
}

const ShowMoreResultsModal: React.FC<ShowMoreResultsModalProps> = ({
  searchQuery,
  onPlayTrack,
  currentPlayingTrackId
}) => {
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { theme } = useTheme();

  const [{ data, fetching, error }, executeSearch] = useQuery({
    query: SEARCH_TRACKS,
    variables: { query: searchQuery, limit: 50, index: 0 },
    pause: true
  });

  // Load initial results
  useEffect(() => {
    if (searchQuery) {
      executeSearch({ requestPolicy: 'network-only' });
    }
  }, [searchQuery, executeSearch]);

  // Handle search results
  useEffect(() => {
    if ((data as any)?.searchTracks) {
      const { tracks, hasMore: moreAvailable } = (data as any).searchTracks;

      if (currentIndex === 0) {
        // Initial load
        setAllTracks(tracks);
        setHasMore(moreAvailable);
      } else {
        // Load more - append to existing tracks
        setAllTracks((prev) => [...prev, ...tracks]);
        setHasMore(moreAvailable);
      }

      setIsLoadingMore(false);
    }
  }, [data, currentIndex]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || fetching) return;

    setIsLoadingMore(true);
    const nextIndex = currentIndex + 50;
    setCurrentIndex(nextIndex);

    try {
      await executeSearch({
        requestPolicy: 'network-only',
        variables: { query: searchQuery, limit: 50, index: nextIndex }
      });
    } catch (err) {
      Logger.error('Load more error:', err);
      setIsLoadingMore(false);
    }
  };

  const handlePlayTrack = (track: Track) => {
    onPlayTrack?.(track);
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

    if (isCloseToBottom && hasMore && !isLoadingMore && !fetching) {
      handleLoadMore();
    }
  };

  return (
    <View className="flex-1 px-4">
      {error && (
        <View className="bg-intent-error/10 mb-4 rounded-lg p-3">
          <TextCustom color={themeColors[theme]['intent-error']}>
            Error: {error.message}
          </TextCustom>
        </View>
      )}

      {allTracks.length > 0 && (
        <View className="mb-4">
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="mb-2"
          >
            Found {allTracks.length} tracks
          </TextCustom>
          <ScrollView
            style={{ flex: 1 }}
            onScroll={handleScroll}
            scrollEventThrottle={400}
            showsVerticalScrollIndicator={true}
          >
            {allTracks.map((track, index) => (
              <TrackCard
                key={`${track.id}-${index}`}
                track={track}
                isPlaying={currentPlayingTrackId === track.id}
                onPlay={handlePlayTrack}
              />
            ))}
            {isLoadingMore && (
              <View className="items-center py-4">
                <ActivityIndicator color={themeColors[theme]['primary']} />
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                  className="mt-2"
                >
                  Loading more tracks...
                </TextCustom>
              </View>
            )}
            {!hasMore && allTracks.length > 0 && (
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
                className="mt-2 text-center"
              >
                No more tracks to load
              </TextCustom>
            )}
          </ScrollView>
        </View>
      )}

      {fetching && (
        <View className="items-center py-4">
          <ActivityIndicator color={themeColors[theme]['primary']} />
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="mt-2"
          >
            Loading tracks...
          </TextCustom>
        </View>
      )}
    </View>
  );
};

export default ShowMoreResultsModal;

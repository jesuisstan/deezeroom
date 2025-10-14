import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import { useClient, useQuery } from 'urql';

import TrackCard from '@/components/search-tracks/TrackCard';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { LIMIT_DEFAULT } from '@/constants/deezer';
import { GET_POPULAR_TRACKS, SEARCH_TRACKS } from '@/graphql/queries';
import { Track } from '@/graphql/schema';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface SearchTracksComponentProps {
  onPlayTrack?: (track: Track) => void;
  onSearchResults?: (tracks: Track[]) => void;
  currentPlayingTrackId?: string;
}

const SearchTracksComponent = ({
  onPlayTrack,
  onSearchResults,
  currentPlayingTrackId
}: SearchTracksComponentProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalTracks, setTotalTracks] = useState(0);
  const [showPopularTracks, setShowPopularTracks] = useState(true);
  const [popularTracksLoaded, setPopularTracksLoaded] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const { theme } = useTheme();
  const client = useClient();

  // Create paused query for manual search execution
  const [{ data, fetching, error }, executeSearch] = useQuery({
    query: SEARCH_TRACKS,
    variables: { query: searchQuery, limit: LIMIT_DEFAULT, index: 0 },
    pause: true
  });

  // Load popular tracks on initial load or when showPopularTracks changes
  useEffect(() => {
    const loadPopularTracks = async () => {
      if (!showPopularTracks || popularTracksLoaded) return;

      setIsLoadingPopular(true);
      try {
        Logger.info('Loading popular tracks', null, '🔍 SearchTracksComponent');
        const result = await client.query(
          GET_POPULAR_TRACKS,
          { limit: LIMIT_DEFAULT },
          { requestPolicy: 'network-only' }
        );

        if (result.data?.getPopularTracks) {
          const { tracks, total } = result.data.getPopularTracks;
          setAllTracks(tracks);
          setTotalTracks(total);
          setHasMore(false); // Popular tracks don't support pagination
          setPopularTracksLoaded(true);
          // Popular tracks loaded successfully
          onSearchResults?.(tracks);
        }
      } catch (err) {
        Logger.error(
          'Error loading popular tracks:',
          err,
          '🔍 SearchTracksComponent'
        );
      } finally {
        setIsLoadingPopular(false);
      }
    };

    loadPopularTracks();
  }, [showPopularTracks, popularTracksLoaded, client, onSearchResults]);

  // Handle received search results
  useEffect(() => {
    if (!data?.searchTracks) return;

    const { tracks, hasMore: moreAvailable, total } = data.searchTracks;

    // If it's a new search, replace existing tracks
    if (currentIndex === 0) {
      setAllTracks(tracks);
      setTotalTracks(total);
    } else {
      // Append new tracks for pagination, avoiding duplicates
      setAllTracks((prev) => {
        const existingIds = new Set(prev.map((track) => track.id));
        const newTracks = tracks.filter(
          (track: Track) => !existingIds.has(track.id)
        );
        return [...prev, ...newTracks];
      });
    }

    setHasMore(moreAvailable);
    setIsLoadingMore(false);
  }, [data, currentIndex]);

  // Notify parent when tracks list changes
  useEffect(() => {
    onSearchResults?.(allTracks);
  }, [allTracks, onSearchResults]);

  // Trigger new search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Attention', 'Enter a search query');
      return;
    }

    Logger.info(
      'Searching tracks with params',
      {
        query: searchQuery,
        limit: LIMIT_DEFAULT,
        index: 0
      },
      '🔍 SearchTracksComponent'
    );

    setIsSearching(true);
    setCurrentIndex(0); // Reset pagination
    setTotalTracks(0); // Reset total count
    setShowPopularTracks(false); // Switch to search mode
    setPopularTracksLoaded(false); // Reset popular tracks flag
    setIsLoadingPopular(false); // Reset popular tracks loading state

    try {
      await executeSearch({
        requestPolicy: 'network-only',
        variables: { query: searchQuery, limit: LIMIT_DEFAULT, index: 0 }
      });
    } catch (err) {
      Logger.error('Search error:', err, '🔍 SearchTracksComponent');
    } finally {
      setIsSearching(false);
    }
  };

  // Load next page
  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || fetching) return;

    setIsLoadingMore(true);
    const nextIndex = currentIndex + LIMIT_DEFAULT;

    try {
      Logger.info(
        'Loading more tracks with params',
        {
          query: searchQuery,
          limit: LIMIT_DEFAULT,
          index: nextIndex
        },
        '🔍 SearchTracksComponent'
      );
      const result = await client.query(
        SEARCH_TRACKS,
        { query: searchQuery, limit: LIMIT_DEFAULT, index: nextIndex },
        { requestPolicy: 'network-only' }
      );

      if (result.data?.searchTracks) {
        const { tracks, hasMore: moreAvailable } = result.data.searchTracks;
        setAllTracks((prev) => {
          const existingIds = new Set(prev.map((track: Track) => track.id));
          const newTracks = tracks.filter(
            (track: Track) => !existingIds.has(track.id)
          );
          return [...prev, ...newTracks];
        });
        setHasMore(moreAvailable);
        setCurrentIndex(nextIndex);
      }
    } catch (err) {
      Logger.error('Load more error:', err, '🔍 SearchTracksComponent');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handlePlayTrack = (track: Track) => {
    onPlayTrack?.(track);
  };

  const handleShowPopularTracks = () => {
    setShowPopularTracks(true);
    setSearchQuery(''); // Clear search query
    setPopularTracksLoaded(false); // Allow reloading popular tracks
    setIsLoadingPopular(false); // Reset loading state
  };

  return (
    <View className="w-full">
      {/* Search input and buttons */}
      <View className="mb-2 flex-row items-center gap-2">
        <InputCustom
          placeholder="Search tracks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          className="flex-1"
          showClearButton
          onClear={() => setSearchQuery('')}
        />
        <IconButton
          accessibilityLabel="Search"
          onPress={handleSearch}
          loading={fetching || isSearching}
          className={`h-12 w-12 ${
            !showPopularTracks && searchQuery.trim() ? 'bg-primary/20' : ''
          }`}
        >
          <Feather
            name="search"
            size={18}
            color={
              !showPopularTracks && searchQuery.trim()
                ? themeColors[theme]['primary']
                : themeColors[theme]['accent']
            }
          />
        </IconButton>
        <IconButton
          accessibilityLabel="Show Popular Tracks"
          onPress={handleShowPopularTracks}
          className={`h-12 w-12 ${showPopularTracks ? 'bg-primary/20' : ''}`}
        >
          <Feather
            name="trending-up"
            size={18}
            color={
              showPopularTracks
                ? themeColors[theme]['primary']
                : themeColors[theme]['accent']
            }
          />
        </IconButton>
      </View>

      {/* Error display */}
      {error && (
        <View className="bg-intent-error/10 mb-2 rounded-lg p-3">
          <TextCustom color={themeColors[theme]['intent-error']}>
            Error: {error.message}
          </TextCustom>
        </View>
      )}

      {/* Search results */}
      {allTracks.length > 0 && !isLoadingPopular && (
        <View className="mb-2">
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="mb-2"
          >
            {showPopularTracks
              ? `Popular Tracks (${allTracks.length})`
              : `Found ${totalTracks} tracks (${allTracks.length} loaded)`}
          </TextCustom>

          <View>
            {allTracks.map((track, index) => (
              <TrackCard
                key={`${track.id}-${index}`}
                track={track}
                isPlaying={currentPlayingTrackId === track.id}
                onPlay={handlePlayTrack}
              />
            ))}
          </View>

          {/* Load more button */}
          {hasMore && !showPopularTracks && (
            <View className="mt-2 items-center">
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
                className="mb-2"
              >
                Loaded {allTracks.length} tracks
              </TextCustom>
              <RippleButton
                title="Show more"
                size="sm"
                onPress={handleLoadMore}
                loading={isLoadingMore}
                width={120}
                disabled={
                  isLoadingMore ||
                  isLoadingPopular ||
                  fetching ||
                  isSearching ||
                  !hasMore ||
                  !searchQuery
                }
              />
            </View>
          )}

          {/* End of list indicator */}
          {!hasMore && allTracks.length > 0 && !showPopularTracks && (
            <TextCustom
              size="xs"
              color={themeColors[theme]['text-secondary']}
              className="mt-2 text-center"
            >
              No more tracks to load
            </TextCustom>
          )}
        </View>
      )}

      {/* Loading state */}
      {(fetching || isSearching || isLoadingPopular) && (
        <View className="items-center py-4">
          <ActivityIndicator color={themeColors[theme]['primary']} />
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="mt-2"
          >
            {isLoadingPopular
              ? 'Loading popular tracks...'
              : 'Searching tracks...'}
          </TextCustom>
        </View>
      )}
    </View>
  );
};

export default SearchTracksComponent;

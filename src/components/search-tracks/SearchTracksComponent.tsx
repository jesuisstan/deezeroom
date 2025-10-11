import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import { useClient, useQuery } from 'urql';

import TrackCard from '@/components/TrackCard';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { LIMIT_DEFAULT } from '@/constants/deezer';
import { SEARCH_TRACKS } from '@/graphql/queries';
import { Track } from '@/graphql/schema';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger/LoggerModule';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface SearchTracksComponentProps {
  onPlayTrack?: (track: Track) => void;
  onSearchResults?: (tracks: Track[]) => void;
  currentPlayingTrackId?: string;
}

export default function SearchTracksComponent({
  onPlayTrack,
  onSearchResults,
  currentPlayingTrackId
}: SearchTracksComponentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { theme } = useTheme();
  const client = useClient();

  const [{ data, fetching, error }, executeSearch] = useQuery({
    query: SEARCH_TRACKS,
    variables: {
      query: searchQuery,
      limit: LIMIT_DEFAULT,
      index: 0
    },
    pause: true // Don't execute automatically
  });

  // Handle search results
  useEffect(() => {
    if ((data as any)?.searchTracks) {
      const { tracks, hasMore: moreAvailable } = (data as any).searchTracks;
      console.log('useEffect triggered:', {
        currentIndex,
        tracksCount: tracks.length,
        hasMore: moreAvailable,
        allTracksLength: allTracks.length
      });

      // Check if this is a new search by comparing with current tracks length
      if (allTracks.length === 0) {
        // New search - replace all tracks
        console.log('New search - replacing tracks');
        setAllTracks(tracks);
        setHasMore(moreAvailable);
        onSearchResults?.(tracks);
      } else {
        // Load more - append to existing tracks
        console.log('Load more - appending tracks');
        setAllTracks((prev) => {
          console.log('Previous tracks count:', prev.length);
          console.log('New tracks count:', tracks.length);
          console.log('First new track:', tracks[0]?.title);
          console.log('Last previous track:', prev[prev.length - 1]?.title);

          const updated = [...prev, ...tracks];
          console.log('Updated tracks count:', updated.length);
          console.log('First track in updated:', updated[0]?.title);
          console.log(
            'Last track in updated:',
            updated[updated.length - 1]?.title
          );
          return updated;
        });
        setHasMore(moreAvailable);
      }

      setIsLoadingMore(false);
    }
  }, [data]);

  // Update parent with search results when allTracks changes
  useEffect(() => {
    onSearchResults?.(allTracks);
  }, [allTracks, onSearchResults]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Attention', 'Enter a search query');
      return;
    }

    setIsSearching(true);
    setCurrentIndex(0); // Reset pagination for new search
    try {
      await executeSearch({
        requestPolicy: 'network-only',
        variables: { query: searchQuery, limit: LIMIT_DEFAULT, index: 0 }
      });
    } catch (err) {
      Logger.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || fetching) return;

    setIsLoadingMore(true);
    const nextIndex = currentIndex + LIMIT_DEFAULT;
    console.log('searchQuery', searchQuery);
    console.log('currentIndex', currentIndex);
    console.log('nextIndex', nextIndex);

    try {
      console.log('Executing search with index:', nextIndex);
      const result = await client.query(
        SEARCH_TRACKS,
        {
          query: searchQuery,
          limit: LIMIT_DEFAULT,
          index: nextIndex
        },
        {
          requestPolicy: 'network-only'
        }
      );

      if (result.data?.searchTracks) {
        const { tracks, hasMore: moreAvailable } = result.data.searchTracks;
        console.log('Load more - appending tracks via client.query');
        setAllTracks((prev) => {
          console.log('Previous tracks count:', prev.length);
          console.log('New tracks count:', tracks.length);
          console.log('First new track:', tracks[0]?.title);
          console.log('Last previous track:', prev[prev.length - 1]?.title);

          const updated = [...prev, ...tracks];
          console.log('Updated tracks count:', updated.length);
          console.log('First track in updated:', updated[0]?.title);
          console.log(
            'Last track in updated:',
            updated[updated.length - 1]?.title
          );
          return updated;
        });
        setHasMore(moreAvailable);
        setCurrentIndex(nextIndex);
      }
    } catch (err) {
      Logger.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handlePlayTrack = (track: Track) => {
    onPlayTrack?.(track);
  };
  //console.log('allTracks', allTracks); // debug
  //console.log('currentIndex', currentIndex);
  //console.log('hasMore', hasMore);

  return (
    <View className="w-full">
      <View className="mb-4 flex-row items-center gap-2">
        <InputCustom
          placeholder="Search tracks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          className="flex-1"
          showClearButton={true}
          onClear={() => setSearchQuery('')}
        />
        <IconButton
          accessibilityLabel="Search"
          onPress={handleSearch}
          loading={fetching || isSearching}
          className="h-12 w-12"
        >
          <Feather
            name="search"
            size={18}
            color={themeColors[theme]['accent']}
          />
        </IconButton>
      </View>

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
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 400 }}
            nestedScrollEnabled={true}
          >
            {allTracks.map((track, index) => (
              <TrackCard
                key={`${track.id}-${index}`}
                track={track}
                isPlaying={currentPlayingTrackId === track.id}
                onPlay={handlePlayTrack}
              />
            ))}
          </ScrollView>
          {hasMore && (
            <View className="mt-2 items-center">
              <RippleButton
                title="Show more"
                size="sm"
                onPress={handleLoadMore}
                loading={isLoadingMore}
                className="px-4 py-2"
              />
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
            Searching tracks...
          </TextCustom>
        </View>
      )}
    </View>
  );
}

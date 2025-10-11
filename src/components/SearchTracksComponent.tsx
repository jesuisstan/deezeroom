import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import { useQuery } from 'urql';

import TrackCard from '@/components/TrackCard';
import IconButton from '@/components/ui/buttons/IconButton';
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
  const { theme } = useTheme();

  const [{ data, fetching, error }, executeSearch] = useQuery({
    query: SEARCH_TRACKS,
    variables: { query: searchQuery },
    pause: true // Don't execute automatically
  });

  // Call onSearchResults when data changes
  useEffect(() => {
    if ((data as any)?.searchTracks?.tracks && onSearchResults) {
      onSearchResults((data as any).searchTracks.tracks);
    }
  }, [data, onSearchResults]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Attention', 'Enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      await executeSearch({ requestPolicy: 'network-only' });
    } catch (err) {
      Logger.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayTrack = (track: Track) => {
    onPlayTrack?.(track);
  };

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

      {(data as any)?.searchTracks?.tracks && (
        <View className="mb-4">
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="mb-2"
          >
            Found {(data as any).searchTracks.total} tracks
          </TextCustom>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 400 }}
            nestedScrollEnabled={true}
          >
            {(data as any).searchTracks.tracks.map((track: Track) => (
              <TrackCard
                key={track.id}
                track={track}
                isPlaying={currentPlayingTrackId === track.id}
                onPlay={handlePlayTrack}
              />
            ))}
          </ScrollView>
          {(data as any).searchTracks.hasMore && (
            <TextCustom
              size="xs"
              color={themeColors[theme]['text-secondary']}
              className="mt-2 text-center"
            >
              Showing first {LIMIT_DEFAULT} results
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

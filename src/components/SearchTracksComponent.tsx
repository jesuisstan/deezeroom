import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import { useQuery } from 'urql';

import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { SearchTracks } from '@/graphql/queries';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger/LoggerModule';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Track } from '@/types/deezer';

interface SearchTracksComponentProps {
  onTrackSelect?: (trackId: string) => void;
  onSearchResults?: (tracks: Track[]) => void;
}

export default function SearchTracksComponent({
  onTrackSelect,
  onSearchResults
}: SearchTracksComponentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { theme } = useTheme();

  const [{ data, fetching, error }, executeSearch] = useQuery({
    query: SearchTracks,
    variables: { query: searchQuery, limit: 20 },
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

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderTrack = ({ item: track }: { item: Track }) => (
    <View className="mb-3 rounded-lg border border-border bg-bg-secondary p-3">
      <View className="flex-row items-center gap-3">
        {track.album.cover && (
          <Image
            source={{ uri: track.album.cover }}
            className="h-12 w-12 rounded"
            resizeMode="cover"
          />
        )}
        <View className="flex-1">
          <TextCustom type="semibold" className="text-sm">
            {track.title}
          </TextCustom>
          <TextCustom className="text-xs text-text-secondary">
            {track.artist.name}
          </TextCustom>
          <TextCustom className="text-xs text-text-secondary">
            {track.album.title} • {formatDuration(track.duration)}
          </TextCustom>
          {track.explicitLyrics && (
            <TextCustom className="text-xs text-intent-warning">
              Explicit
            </TextCustom>
          )}
        </View>
        {onTrackSelect && (
          <RippleButton
            title="Select"
            size="sm"
            onPress={() => onTrackSelect(track.id)}
          />
        )}
      </View>
    </View>
  );

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
          <TextCustom className="mb-2 text-sm text-text-secondary">
            Found {(data as any).searchTracks.total} tracks
          </TextCustom>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 400 }}
            nestedScrollEnabled={true}
          >
            {(data as any).searchTracks.tracks.map((track: Track) => (
              <View key={track.id}>{renderTrack({ item: track })}</View>
            ))}
          </ScrollView>
          {(data as any).searchTracks.hasMore && (
            <TextCustom className="mt-2 text-center text-xs text-text-secondary">
              Showing first 20 results
            </TextCustom>
          )}
        </View>
      )}

      {fetching && (
        <View className="items-center py-4">
          <ActivityIndicator color={themeColors[theme]['primary']} />
          <TextCustom className="mt-2 text-sm text-text-secondary">
            Searching tracks...
          </TextCustom>
        </View>
      )}
    </View>
  );
}

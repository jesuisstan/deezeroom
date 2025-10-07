import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  View
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import {
  DeezerService,
  DeezerTrack,
  SearchResult
} from '@/utils/api/deezer-service';

import RippleButton from './ui/buttons/RippleButton';

interface MusicSearchProps {
  onTrackSelect?: (track: DeezerTrack) => void;
  onArtistSelect?: (artist: any) => void;
  onPlaylistSelect?: (playlist: any) => void;
  onSearchResults?: (results: DeezerTrack[]) => void;
}

const MusicSearch: React.FC<MusicSearchProps> = ({
  onTrackSelect,
  onArtistSelect,
  onPlaylistSelect,
  onSearchResults
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult<DeezerTrack>>(
    {
      data: [],
      total: 0
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<
    'tracks' | 'artists' | 'playlists'
  >('tracks');

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Notifier.shoot({
        type: 'warn',
        title: 'Search Required',
        message: 'Please enter a search query'
      });
      return;
    }

    setIsLoading(true);
    try {
      let results;
      switch (searchType) {
        case 'tracks':
          results = await DeezerService.searchTracks(searchQuery, 25);
          break;
        case 'artists':
          results = await DeezerService.searchArtists(searchQuery, 25);
          break;
        case 'playlists':
          results = await DeezerService.searchPlaylists(searchQuery, 25);
          break;
        default:
          results = await DeezerService.searchTracks(searchQuery, 25);
      }
      setSearchResults(results);

      // Notify parent component about track search results
      if (searchType === 'tracks' && onSearchResults && results.data) {
        onSearchResults(results.data);
      }
    } catch (error) {
      console.error('Search error:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Search Error',
        message: 'Failed to search music'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderTrackItem = ({ item }: { item: DeezerTrack }) => (
    <Pressable
      onPress={() => onTrackSelect?.(item)}
      className="mb-3 rounded-xl border p-4"
      style={{
        backgroundColor: themeColors[theme]['bg-secondary'],
        borderColor: themeColors[theme]['border']
      }}
    >
      <View className="flex-row items-center gap-3">
        {/* Album Cover */}
        <View className="h-12 w-12 overflow-hidden rounded-lg">
          {item.album.coverSmall ? (
            <Image
              source={{ uri: item.album.coverSmall }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              className="h-full w-full items-center justify-center"
              style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
            >
              <MaterialCommunityIcons
                name="music"
                size={20}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          )}
        </View>

        {/* Track Info */}
        <View className="flex-1">
          <TextCustom type="subtitle" className="mb-1">
            {item.title}
          </TextCustom>
          <TextCustom
            size="s"
            style={{ color: themeColors[theme]['text-secondary'] }}
          >
            {item.artist.name}
          </TextCustom>
          <TextCustom
            size="xs"
            style={{ color: themeColors[theme]['text-secondary'] }}
          >
            {item.album.title} • {formatDuration(item.duration)}
          </TextCustom>
        </View>

        {/* Preview Button */}
        {item.preview && (
          <Pressable
            onPress={() => {
              // Handle preview playback
              Notifier.shoot({
                type: 'info',
                title: 'Preview',
                message: `Playing preview of ${item.title}`
              });
            }}
            className="rounded-full p-2"
            style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
          >
            <MaterialCommunityIcons
              name="play"
              size={16}
              color={themeColors[theme]['primary']}
            />
          </Pressable>
        )}
      </View>
    </Pressable>
  );

  const renderArtistItem = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => onArtistSelect?.(item)}
      className="mb-3 rounded-xl border p-4"
      style={{
        backgroundColor: themeColors[theme]['bg-secondary'],
        borderColor: themeColors[theme]['border']
      }}
    >
      <View className="flex-row items-center gap-3">
        {/* Artist Picture */}
        <View className="h-12 w-12 overflow-hidden rounded-full">
          {item.pictureSmall ? (
            <Image
              source={{ uri: item.pictureSmall }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              className="h-full w-full items-center justify-center"
              style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
            >
              <MaterialCommunityIcons
                name="account"
                size={20}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          )}
        </View>

        {/* Artist Info */}
        <View className="flex-1">
          <TextCustom type="subtitle" className="mb-1">
            {item.name}
          </TextCustom>
          <TextCustom
            size="s"
            style={{ color: themeColors[theme]['text-secondary'] }}
          >
            Artist
          </TextCustom>
        </View>

        {/* Radio Button */}
        {item.radio && (
          <Pressable
            onPress={() => {
              Notifier.shoot({
                type: 'info',
                title: 'Radio',
                message: `Starting radio for ${item.name}`
              });
            }}
            className="rounded-full p-2"
            style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
          >
            <MaterialCommunityIcons
              name="radio"
              size={16}
              color={themeColors[theme]['primary']}
            />
          </Pressable>
        )}
      </View>
    </Pressable>
  );

  const renderPlaylistItem = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => onPlaylistSelect?.(item)}
      className="mb-3 rounded-xl border p-4"
      style={{
        backgroundColor: themeColors[theme]['bg-secondary'],
        borderColor: themeColors[theme]['border']
      }}
    >
      <View className="flex-row items-center gap-3">
        {/* Playlist Picture */}
        <View className="h-12 w-12 overflow-hidden rounded-lg">
          {item.pictureSmall ? (
            <Image
              source={{ uri: item.pictureSmall }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              className="h-full w-full items-center justify-center"
              style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
            >
              <MaterialCommunityIcons
                name="playlist-music"
                size={20}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          )}
        </View>

        {/* Playlist Info */}
        <View className="flex-1">
          <TextCustom type="subtitle" className="mb-1">
            {item.title}
          </TextCustom>
          <TextCustom
            size="s"
            style={{ color: themeColors[theme]['text-secondary'] }}
          >
            {item.creator?.name || 'Unknown Creator'}
          </TextCustom>
          <TextCustom
            size="xs"
            style={{ color: themeColors[theme]['text-secondary'] }}
          >
            {item.nbTracks || 0} tracks • {item.fans || 0} fans
          </TextCustom>
        </View>

        {/* Public/Private Indicator */}
        <View
          className="rounded-full px-2 py-1"
          style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
        >
          <MaterialCommunityIcons
            name={item.public === true ? 'earth' : 'lock'}
            size={12}
            color={themeColors[theme]['text-secondary']}
          />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1">
      {/* Search Input */}
      <View className="mb-4">
        <InputCustom
          label="Search Music"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search for tracks, artists, or playlists..."
          onSubmitEditing={handleSearch}
        />
      </View>

      {/* Search Type Selector */}
      <View className="mb-4 flex-row gap-2">
        {(['tracks', 'artists', 'playlists'] as const).map((type) => (
          <RippleButton
            key={type}
            title={type}
            onPress={() => setSearchType(type)}
            variant={searchType === type ? 'primary' : 'outline'}
            size="sm"
          />
        ))}
      </View>

      {/* Search Button */}
      <Pressable
        onPress={handleSearch}
        disabled={isLoading}
        className="mb-4 rounded-xl border-2 p-4"
        style={{
          backgroundColor: themeColors[theme]['primary'],
          borderColor: themeColors[theme]['primary'],
          opacity: isLoading ? 0.6 : 1
        }}
      >
        <View className="flex-row items-center justify-center gap-2">
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={themeColors[theme]['text-inverse']}
            />
          ) : (
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={themeColors[theme]['text-inverse']}
            />
          )}
          <TextCustom
            type="bold"
            style={{ color: themeColors[theme]['text-inverse'] }}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </TextCustom>
        </View>
      </Pressable>

      {/* Results */}
      {searchResults.data.length > 0 && (
        <View className="flex-1">
          <TextCustom className="mb-3" type="subtitle">
            Results ({searchResults.total})
          </TextCustom>
          <FlatList
            data={searchResults.data}
            renderItem={
              searchType === 'tracks'
                ? renderTrackItem
                : searchType === 'artists'
                  ? renderArtistItem
                  : renderPlaylistItem
            }
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Empty State */}
      {searchResults.data.length === 0 && !isLoading && searchQuery && (
        <View className="flex-1 items-center justify-center">
          <MaterialCommunityIcons
            name="music-off"
            size={48}
            color={themeColors[theme]['text-secondary']}
          />
          <TextCustom className="mt-4 text-center" type="subtitle">
            No results found
          </TextCustom>
          <TextCustom className="mt-2 text-center opacity-70">
            Try searching for different terms
          </TextCustom>
        </View>
      )}
    </View>
  );
};

export default MusicSearch;

import { useCallback, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';

import { useRouter } from 'expo-router';

import SearchTracksComponent from '@/components/search-tracks/SearchTracksComponent';
import FeatureTile from '@/components/ui/FeatureTile';
import { TextCustom } from '@/components/ui/TextCustom';
import { Track } from '@/graphql/schema';
import { usePlayback } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const HomeScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { startPlayback, togglePlayPause, currentTrack, isPlaying } =
    usePlayback();
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
      router.push('/player');
      return;
    }

    startPlayback(searchResults, track.id);
    router.push('/player');
  };

  const handleSearchResults = useCallback((tracks: Track[]) => {
    setSearchResults(tracks);
  }, []);

  const handleNavigateToEvents = () => {
    router.push('/(tabs)/events');
  };

  const handleNavigateToPlaylists = () => {
    router.push('/(tabs)/playlists');
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{ flexGrow: 1 }}
      className="bg-bg-main"
    >
      <View className="min-h-full w-full flex-col items-center justify-start gap-4 self-center p-4">
        {/* Welcome Section */}
        <View className="w-full gap-2">
          <View className="items-center">
            <Image
              source={
                theme === 'dark'
                  ? require('@/assets/images/logo/logo-text-white-bg-transparent.png')
                  : require('@/assets/images/logo/logo-text-black-bg-transparent.png')
              }
              style={{ height: 60, width: 280 }}
              resizeMode="contain"
            />
            <TextCustom
              type="subtitle"
              size="l"
              color={themeColors[theme]['text-secondary']}
            >
              welcome to the party
            </TextCustom>
          </View>

          <TextCustom
            size="m"
            color={themeColors[theme]['text-secondary']}
            className="text-center"
          >
            Create playlists with friends, vote for tracks at events and enjoy
            music together
          </TextCustom>
        </View>

        {/* Feature Tiles */}
        <View className="w-full gap-4">
          <View className="flex-row gap-4">
            {/* Music Track Vote Tile */}
            <FeatureTile
              onPress={handleNavigateToEvents}
              icon="vote"
              title="Music Track Vote"
              description="Vote for tracks at events to move them up"
              backgroundColor={themeColors[theme]['primary']}
            />

            {/* Music Playlist Editor Tile */}
            <FeatureTile
              onPress={handleNavigateToPlaylists}
              icon="playlist-music"
              title="Playlist Editor"
              description="Create live collaborative playlists"
              backgroundColor={themeColors[theme]['intent-success']}
            />
          </View>
        </View>

        {/* Search Section */}
        <View className="w-full gap-2">
          <TextCustom type="subtitle" size="xl">
            Music Search
          </TextCustom>
          <SearchTracksComponent
            onPlayTrack={handlePlayTrack}
            onSearchResults={handleSearchResults}
            currentPlayingTrackId={isPlaying ? currentTrack?.id : undefined}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;

import { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

import SearchTracksComponent from '@/components/search-tracks/SearchTracksComponent';
import RippleButton from '@/components/ui/buttons/RippleButton';
import FeatureTile from '@/components/ui/FeatureTile';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { Track } from '@/graphql/schema';
import {
  usePlaybackActions,
  usePlaybackState,
  usePlaybackUI
} from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';

const HomeScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();

  // Split into separate hooks to minimize re-renders
  const { currentTrack } = usePlaybackState();
  const { isPlaying } = usePlaybackUI();
  const { startPlayback, togglePlayPause } = usePlaybackActions();

  const [searchResults, setSearchResults] = useState<Track[]>([]);

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlayPause();
      return;
    }

    startPlayback(searchResults, track.id, {
      source: 'search',
      label: 'MIX'
    });
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

  // Add padding when mini player is visible
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: bottomPadding
      }}
      className="bg-bg-main"
    >
      <View
        style={containerWidthStyle}
        className="min-h-full w-full flex-col items-center justify-start gap-4 self-center py-4"
      >
        {/* Welcome Section */}
        <View className="w-full gap-2 px-4">
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
              size="xl"
              color={themeColors[theme]['primary']}
            >
              welcome to the party
            </TextCustom>
          </View>

          <RippleButton
            title="About"
            variant="ghost"
            onPress={() => router.push('/about' as any)}
            size="sm"
            leftIcon={
              <MaterialCommunityIcons
                name="information"
                size={21}
                color={themeColors[theme]['primary']}
              />
            }
          />

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
        <View className="w-full gap-4 px-4">
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
          <SearchTracksComponent
            onPressTrack={handlePlayTrack}
            onSearchResults={handleSearchResults}
            currentPlayingTrackId={isPlaying ? currentTrack?.id : undefined}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;

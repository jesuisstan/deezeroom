import React, { useState } from 'react';
import { FlatList, View } from 'react-native';

import { useRouter } from 'expo-router';

import SearchTracksComponent from '@/components/search-tracks/SearchTracksComponent';
import { Track } from '@/graphql/schema';
import { usePlayback } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const HomeScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    startPlayback,
    togglePlayPause,
    updateQueue,
    currentTrack,
    isPlaying
  } = usePlayback();
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

  const handleSearchResults = (tracks: Track[]) => {
    setSearchResults(tracks);
    updateQueue(tracks);
  };

  return (
    <FlatList
      data={[{ id: 'main-content' }]}
      renderItem={() => (
        <View
          style={{
            paddingBottom: 16,
            paddingHorizontal: 16,
            paddingTop: 16,
            gap: 16,
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            backgroundColor:
              theme === 'dark'
                ? themeColors.dark['bg-main']
                : themeColors.light['bg-main'],
            flexDirection: 'column',
            alignSelf: 'center',
            minHeight: '100%'
          }}
        >
          <View className="w-full flex-1 gap-4">
            <SearchTracksComponent
              onPlayTrack={handlePlayTrack}
              onSearchResults={handleSearchResults}
              currentPlayingTrackId={
                isPlaying ? currentTrack?.id : undefined
              }
            />
          </View>
        </View>
      )}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{ flexGrow: 1 }}
    />
  );
};

export default HomeScreen;

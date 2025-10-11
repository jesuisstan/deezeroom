import React, { useState } from 'react';
import { FlatList, View } from 'react-native';

import DeezerPreviewPlayer from '@/components/DeezerPreviewPlayer';
import SearchTracksComponent from '@/components/search-tracks/SearchTracksComponent';
import Divider from '@/components/ui/Divider';
import { Track } from '@/graphql/schema';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const HomeScreen = () => {
  const { theme } = useTheme();
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();

  const handlePlayTrack = (track: Track) => {
    setCurrentPlayingTrackId(track.id);
  };

  const handleSearchResults = (tracks: Track[]) => {
    setSearchResults(tracks);
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
            {/* Preview Player */}
            <DeezerPreviewPlayer
              tracks={searchResults}
              currentTrackId={currentPlayingTrackId}
              onTrackChange={(track) => {
                console.log('Track changed to:', track?.title);
              }}
              onPlayTrack={handlePlayTrack}
            />

            <Divider />

            {/* Search Tracks Component */}
            <SearchTracksComponent
              onPlayTrack={handlePlayTrack}
              onSearchResults={handleSearchResults}
              currentPlayingTrackId={currentPlayingTrackId}
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

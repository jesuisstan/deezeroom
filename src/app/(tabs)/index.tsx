import React, { useState } from 'react';
import { FlatList, View } from 'react-native';

import DeezerPreviewPlayer from '@/components/DeezerPreviewPlayer';
import SearchTracksComponent from '@/components/SearchTracksComponent';
import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Track } from '@/types/deezer';

const HomeScreen = () => {
  const { theme } = useTheme();
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  const handleTrackSelect = (trackId: string) => {
    // Находим трек по ID и устанавливаем его как текущий в плеере
    const track = searchResults.find((t) => t.id === trackId);
    if (track) {
      // Можно добавить логику для установки конкретного трека как текущего
      console.log('Selected track:', track.title);
    }
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
            <TextCustom type="subtitle" className="text-center">
              DEEZEROOM APP with Deezer API
            </TextCustom>
            <Divider />

            {/* Preview Player */}
            <DeezerPreviewPlayer
              tracks={searchResults}
              onTrackChange={(track) => {
                console.log('Track changed to:', track?.title);
              }}
            />

            <Divider />

            {/* Search Tracks Component */}
            <SearchTracksComponent
              onTrackSelect={handleTrackSelect}
              onSearchResults={handleSearchResults}
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

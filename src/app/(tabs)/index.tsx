import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import DeezerPreviewPlayer from '@/components/DeezerPreviewPlayer';
import MusicSearch from '@/components/MusicSearch';
import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const HomeScreen = () => {
  const { theme } = useTheme();
  const [currentTrack, setCurrentTrack] = useState<any | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Handle track selection from search
  const handleTrackSelect = (track: any) => {
    // Stop any currently playing track before switching
    setCurrentTrack(track);
    // Find the track index in search results
    const index = searchResults.findIndex((t) => t.id === track.id);
    if (index !== -1) {
      setCurrentTrackIndex(index);
    }
  };

  // Handle navigation
  const handlePrevious = () => {
    if (currentTrackIndex > 0) {
      const newIndex = currentTrackIndex - 1;
      setCurrentTrackIndex(newIndex);
      setCurrentTrack(searchResults[newIndex]);
    }
  };

  const handleNext = () => {
    if (currentTrackIndex < searchResults.length - 1) {
      const newIndex = currentTrackIndex + 1;
      setCurrentTrackIndex(newIndex);
      setCurrentTrack(searchResults[newIndex]);
    }
  };

  // Handle track change notification
  const handleTrackChange = () => {
    // This callback is called when track changes via navigation buttons
    // The player will handle stopping the current track
  };

  // Update search results when MusicSearch component updates them
  const handleSearchResultsUpdate = (results: any[]) => {
    setSearchResults(results);
    if (results.length > 0 && !currentTrack) {
      // Auto-select first track if none is selected
      setCurrentTrack(results[0]);
      setCurrentTrackIndex(0);
    }
  };

  return (
    <ScrollView
      //className="flex-1 bg-bg-main"
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor:
          theme === 'dark'
            ? themeColors.dark['bg-main']
            : themeColors.light['bg-main'],
        flexDirection: 'column',
        alignSelf: 'center'
      }}
    >
      <View className="flex-row items-center gap-2">
        <TextCustom type="title">DEEZEROOM APP</TextCustom>
      </View>
      <TextCustom className="animate-pulse text-center">
        To be implemented soon...
      </TextCustom>
      <Divider />
      <DeezerPreviewPlayer
        track={currentTrack}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={currentTrackIndex > 0}
        hasNext={currentTrackIndex < searchResults.length - 1}
        onTrackChange={handleTrackChange}
      />
      <Divider />
      <MusicSearch
        onTrackSelect={handleTrackSelect}
        onSearchResults={handleSearchResultsUpdate}
      />
    </ScrollView>
  );
};

export default HomeScreen;

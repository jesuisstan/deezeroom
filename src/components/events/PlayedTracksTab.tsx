import React from 'react';
import { View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import PlayedTrackCard from '@/components/events/PlayedTrackCard';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { PlayedTrack } from '@/utils/firebase/firebase-service-events';

interface PlayedTracksTabProps {
  playedTracks: PlayedTrack[];
}

const PlayedTracksTab: React.FC<PlayedTracksTabProps> = ({ playedTracks }) => {
  const { theme } = useTheme();

  if (playedTracks.length === 0) {
    return (
      <View className="items-center justify-center py-12">
        <MaterialCommunityIcons
          name="history"
          size={42}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom
          className="mt-4 text-center"
          color={themeColors[theme]['text-secondary']}
        >
          No tracks played yet
        </TextCustom>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {playedTracks
        .slice()
        .reverse()
        .map((playedTrack, index) => (
          <PlayedTrackCard
            key={`${playedTrack.trackId}-${index}`}
            playedTrack={playedTrack}
          />
        ))}
    </View>
  );
};

export default PlayedTracksTab;

import React, { useState } from 'react';
import { View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Track } from '@/types/deezer';

interface DeezerPreviewPlayerProps {
  tracks: Track[];
  onTrackChange?: (track: Track | null) => void;
}

const DeezerPreviewPlayer: React.FC<DeezerPreviewPlayerProps> = ({
  tracks,
  onTrackChange
}) => {
  const { theme } = useTheme();
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);

  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null;
  const hasPrevious = currentTrackIndex > 0;
  const hasNext = currentTrackIndex < tracks.length - 1;

  // Initialize player once track data is ready
  const player = useAudioPlayer(
    currentTrack?.preview ? { uri: currentTrack.preview } : undefined
  );

  const handlePrevious = () => {
    if (hasPrevious) {
      const newIndex = currentTrackIndex - 1;
      setCurrentTrackIndex(newIndex);
      onTrackChange?.(tracks[newIndex]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const newIndex = currentTrackIndex + 1;
      setCurrentTrackIndex(newIndex);
      onTrackChange?.(tracks[newIndex]);
    }
  };

  const handleStop = () => {
    player.pause();
    player.seekTo(0);
  };

  if (!currentTrack) {
    return (
      <View className="mt-20 items-center justify-center">
        <FontAwesome
          name="music"
          size={48}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom className="mt-4 text-center" type="subtitle">
          No tracks available
        </TextCustom>
        <TextCustom className="mt-2 text-center opacity-70">
          Search for music to start playing
        </TextCustom>
      </View>
    );
  }

  return (
    <View className="w-4/5 self-center">
      {/* Track Info */}
      <View className="mb-6 items-center">
        <FontAwesome
          name="music"
          size={32}
          color={themeColors[theme]['primary']}
          className="mb-2"
        />
        <TextCustom type="subtitle" className="text-center">
          {currentTrack.title}
        </TextCustom>
        <TextCustom className="text-center opacity-70">
          {currentTrack.artist.name} • {currentTrack.album.title}
        </TextCustom>
        <TextCustom size="xs" className="mt-1 opacity-50">
          Duration: {Math.floor(currentTrack.duration / 60)}:
          {(currentTrack.duration % 60).toString().padStart(2, '0')}
        </TextCustom>
        <TextCustom size="xs" className="mt-1 opacity-50">
          Track {currentTrackIndex + 1} of {tracks.length}
        </TextCustom>
      </View>

      {/* Player Controls */}
      <View className="flex-row items-center justify-center gap-4">
        {/* Previous Button */}
        <IconButton
          accessibilityLabel="Previous track"
          onPress={handlePrevious}
          disabled={!hasPrevious}
        >
          <FontAwesome
            name="step-backward"
            size={20}
            color={
              hasPrevious
                ? themeColors[theme]['text-main']
                : themeColors[theme]['text-disabled']
            }
          />
        </IconButton>

        {/* Play/Pause Button */}
        <IconButton accessibilityLabel="Play" onPress={() => player.play()}>
          <FontAwesome
            name="play"
            size={24}
            color={themeColors[theme]['primary']}
          />
        </IconButton>

        <IconButton accessibilityLabel="Pause" onPress={() => player.pause()}>
          <FontAwesome
            name="pause"
            size={24}
            color={themeColors[theme]['intent-warning']}
          />
        </IconButton>

        {/* Stop Button */}
        <IconButton accessibilityLabel="Stop" onPress={handleStop}>
          <FontAwesome
            name="stop"
            size={20}
            color={themeColors[theme]['intent-error']}
          />
        </IconButton>

        {/* Next Button */}
        <IconButton
          accessibilityLabel="Next track"
          onPress={handleNext}
          disabled={!hasNext}
        >
          <FontAwesome
            name="step-forward"
            size={20}
            color={
              hasNext
                ? themeColors[theme]['text-main']
                : themeColors[theme]['text-disabled']
            }
          />
        </IconButton>
      </View>
    </View>
  );
};

export default DeezerPreviewPlayer;

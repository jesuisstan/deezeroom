import React, { useState } from 'react';
import { View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Track } from '@/graphql/schema';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface DeezerPreviewPlayerProps {
  tracks: Track[];
  currentTrackId?: string;
  onTrackChange?: (track: Track | null) => void;
  onPlayTrack?: (track: Track) => void;
}

const DeezerPreviewPlayer: React.FC<DeezerPreviewPlayerProps> = ({
  tracks,
  currentTrackId,
  onTrackChange,
  onPlayTrack
}) => {
  const { theme } = useTheme();
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Find current track index based on currentTrackId
  const activeTrackIndex = currentTrackId
    ? tracks.findIndex((track) => track.id === currentTrackId)
    : currentTrackIndex;

  const currentTrack = tracks.length > 0 ? tracks[activeTrackIndex] : null;
  const hasPrevious = activeTrackIndex > 0;
  const hasNext = activeTrackIndex < tracks.length - 1;

  // Initialize player once track data is ready
  const player = useAudioPlayer(
    currentTrack?.preview ? { uri: currentTrack.preview } : undefined
  );

  const handlePrevious = () => {
    if (hasPrevious) {
      const newIndex = activeTrackIndex - 1;
      setCurrentTrackIndex(newIndex);
      onTrackChange?.(tracks[newIndex]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const newIndex = activeTrackIndex + 1;
      setCurrentTrackIndex(newIndex);
      onTrackChange?.(tracks[newIndex]);
    }
  };

  const handlePlay = () => {
    if (currentTrack) {
      setIsPlaying(true);
      player.play();
      onPlayTrack?.(currentTrack);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    player.pause();
  };

  const handleStop = () => {
    setIsPlaying(false);
    player.pause();
    player.seekTo(0);
  };

  if (!currentTrack) {
    return (
      <View className="items-center justify-center">
        <TextCustom type="subtitle" className="mt-4 text-center">
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
          Track {activeTrackIndex + 1} of {tracks.length}
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
        <IconButton
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          onPress={isPlaying ? handlePause : handlePlay}
        >
          <FontAwesome
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={themeColors[theme]['primary']}
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

import React from 'react';
import { View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { DeezerTrack } from '@/utils/api/deezer-service';

interface DeezerPreviewPlayerProps {
  track: DeezerTrack | null;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onTrackChange?: () => void;
}

const DeezerPreviewPlayer: React.FC<DeezerPreviewPlayerProps> = ({
  track,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  onTrackChange
}) => {
  const { theme } = useTheme();

  // Initialize player once track data is ready
  const player = useAudioPlayer(
    track?.preview ? { uri: track.preview } : undefined
  );

  if (!track) {
    return (
      <View className="mt-20 items-center justify-center">
        <FontAwesome
          name="music"
          size={48}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom className="mt-4 text-center" type="subtitle">
          No track selected
        </TextCustom>
        <TextCustom className="mt-2 text-center opacity-70">
          Search for music to start playing
        </TextCustom>
      </View>
    );
  }

  return (
    <View className="mt-20 w-4/5 self-center">
      {/* Track Info */}
      <View className="mb-6 items-center">
        <FontAwesome
          name="music"
          size={32}
          color={themeColors[theme]['primary']}
          className="mb-2"
        />
        <TextCustom type="subtitle" className="text-center">
          {track.title}
        </TextCustom>
        <TextCustom className="text-center opacity-70">
          {track.artist.name} • {track.album.title}
        </TextCustom>
        <TextCustom size="xs" className="mt-1 opacity-50">
          Duration: {Math.floor(track.duration / 60)}:
          {(track.duration % 60).toString().padStart(2, '0')}
        </TextCustom>
      </View>

      {/* Player Controls */}
      <View className="flex-row items-center justify-center gap-4">
        {/* Previous Button */}
        <IconButton
          accessibilityLabel="Previous track"
          onPress={() => {
            player.pause();
            player.seekTo(0);
            onPrevious?.();
            onTrackChange?.();
          }}
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
        <IconButton
          accessibilityLabel="Stop"
          onPress={() => {
            player.pause();
            player.seekTo(0);
          }}
        >
          <FontAwesome
            name="stop"
            size={20}
            color={themeColors[theme]['intent-error']}
          />
        </IconButton>

        {/* Next Button */}
        <IconButton
          accessibilityLabel="Next track"
          onPress={() => {
            player.pause();
            player.seekTo(0);
            onNext?.();
            onTrackChange?.();
          }}
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

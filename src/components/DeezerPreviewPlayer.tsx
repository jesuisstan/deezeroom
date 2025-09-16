import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';

import IconButton from '@/components/ui/buttons/IconButton';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const DeezerPreviewPlayer = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  // Fetch preview URL
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch('https://api.deezer.com/track/3135556');
        const data = await res.json();
        setPreviewUrl(data.preview);
      } catch (err) {
        console.error('Error fetching Deezer track:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreview();
  }, []);

  // Initialize player once URL is ready
  const player = useAudioPlayer(previewUrl ? { uri: previewUrl } : undefined);

  if (isLoading) return <ActivityIndicator size="large" className="mt-20" />;

  return (
    <View className="mt-20 w-3/5 flex-row items-center justify-around self-center">
      {/* Play */}

      <IconButton accessibilityLabel="Play" onPress={() => player.play()}>
        <FontAwesome
          name="play"
          size={21}
          color={themeColors[theme]['accent']}
        />
      </IconButton>

      {/* Pause */}
      <IconButton accessibilityLabel="Pause" onPress={() => player.pause()}>
        <FontAwesome
          name="pause"
          size={21}
          color={themeColors[theme]['intent-warning']}
        />
      </IconButton>

      {/* Stop = pause + seekTo(0) */}
      <IconButton
        accessibilityLabel="Stop"
        onPress={() => {
          player.pause();
          player.seekTo(0);
        }}
      >
        <FontAwesome
          name="stop"
          size={21}
          color={themeColors[theme]['intent-error']}
        />
      </IconButton>
    </View>
  );
};

export default DeezerPreviewPlayer;

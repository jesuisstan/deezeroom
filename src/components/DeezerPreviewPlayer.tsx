import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

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

      <View className="h-12 w-12 overflow-hidden rounded-full border border-border bg-intent-success">
        <Pressable
          onPress={() => player.play()}
          className="flex-1 items-center justify-center"
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Play"
          android_ripple={{
            color: themeColors[theme]['border'],
            borderless: false
          }}
        >
          <FontAwesome
            name="play"
            size={21}
            color={themeColors[theme]['accent']}
          />
        </Pressable>
      </View>

      {/* Pause */}
      <View className="h-12 w-12 overflow-hidden rounded-full border border-border bg-intent-warning">
        <Pressable
          onPress={() => player.pause()}
          className="flex-1 items-center justify-center"
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="pause"
          android_ripple={{
            color: themeColors[theme]['border'],
            borderless: false
          }}
        >
          <FontAwesome
            name="pause"
            size={21}
            color={themeColors[theme]['accent']}
          />
        </Pressable>
      </View>

      {/* Stop = pause + seekTo(0) */}
      <View className="h-12 w-12 overflow-hidden rounded-full border border-border bg-intent-error">
        <Pressable
          onPress={() => {
            player.pause();
            player.seekTo(0);
          }}
          className="flex-1 items-center justify-center"
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="stop"
          android_ripple={{
            color: themeColors[theme]['border'],
            borderless: false
          }}
        >
          <FontAwesome
            name="stop"
            size={21}
            color={themeColors[theme]['accent']}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default DeezerPreviewPlayer;

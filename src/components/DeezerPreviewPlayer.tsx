import React, { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';

const DeezerPreviewPlayer = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    <View className="flex-row justify-around items-center w-3/5 self-center mt-20">
      {/* Play */}
      <TouchableOpacity
        onPress={() => player.play()}
        className="p-4 bg-green-500 rounded-full"
      >
        <FontAwesome name="play" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Pause */}
      <TouchableOpacity
        onPress={() => player.pause()}
        className="p-4 bg-yellow-500 rounded-full"
      >
        <FontAwesome name="pause" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Stop = pause + seekTo(0) */}
      <TouchableOpacity
        onPress={() => {
          player.pause();
          player.seekTo(0);
        }}
        className="p-4 bg-red-500 rounded-full"
      >
        <FontAwesome name="stop" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default DeezerPreviewPlayer;

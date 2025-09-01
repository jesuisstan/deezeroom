import { Pressable, TextInput, Image } from 'react-native';
import { useState } from 'react';

import ParallaxScrollView from '@/components/ui/ParallaxScrollView';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import shootAlert from '@/utils/shoot-alert';
import { HelloWave } from '@/components/HelloWave';

export default function HomeScreen() {
  const [name, setName] = useState('');

  const fetchGreeting = async () => {
    const response = await fetch('/api/greeting');
    const data = await response.json();
    shootAlert('dialog', 'Greeting', data.greeting, 'warning');
  };

  const postGreeting = async () => {
    const response = await fetch(
      `/api/greeting?name=${encodeURIComponent(name)}`,
      { method: 'POST' }
    );
    const data = await response.json();
    shootAlert('toast', 'Greeting', data.greeting, 'error');
  };

  const postGraphql = async () => {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '{ greeting }'
      })
    });
    const data = await response.json();
    shootAlert('dialog', 'Greeting', data.data.greeting, 'success');
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{
        light: '#fdfcfe',
        dark: '#0f0d13'
      }}
      headerImage={
        <Image
          source={require('@/assets/images/logo/deezeroom-black-transparent.png')}
          className="absolute w-3/4 bottom-2.5 left-2.5"
          resizeMode="contain"
        />
      }
    >
      <ThemedView className="flex-row items-center gap-2">
        <ThemedText type="title">deezeroom app</ThemedText>
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <ThemedText type="subtitle">Open an API route</ThemedText>
        <Pressable onPress={fetchGreeting}>
          <ThemedText className="underline">GET /api/greeting</ThemedText>
        </Pressable>
        <ThemedView className="flex-row items-center gap-2">
          <TextInput
            className="border border-accent-main text-accent-weak rounded p-2 flex-1"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#c17aff"
          />
          <Pressable onPress={postGreeting}>
            <ThemedText className="underline">POST /api/greeting</ThemedText>
          </Pressable>
        </ThemedView>
        <Pressable onPress={postGraphql}>
          <ThemedText className="underline">POST /api/graphql</ThemedText>
        </Pressable>
        <ThemedText>
          Whereas disregard and contempt for human rights have resulted
        </ThemedText>
      </ThemedView>
      <HelloWave />
    </ParallaxScrollView>
  );
}

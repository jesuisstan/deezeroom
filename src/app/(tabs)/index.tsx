import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';
import shootAlert from '@/utils/shoot-alert';

export default function HomeScreen() {
  const [name, setName] = useState('');
  const { theme } = useTheme();

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
    <ScrollView
      //className="flex-1 bg-background"
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        paddingBottom: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor:
          theme === 'dark'
            ? themeColors.dark.background
            : themeColors.light.background,
        flexDirection: 'column',
        alignSelf: 'center'
      }}
    >
      <View className="flex-row items-center gap-2">
        <TextCustom type="title">DEEZEROOM APP</TextCustom>
      </View>
      <View className="gap-2 mb-2">
        <TextCustom type="subtitle">Open an API route</TextCustom>
        <Pressable onPress={fetchGreeting}>
          <TextCustom type="link">GET /api/greeting</TextCustom>
        </Pressable>
        <View className="flex-row items-center gap-2 w-full">
          <TextInput
            className="border border-accent text-intent-warning rounded p-2 flex-1"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            placeholderTextColor={themeColors.light.accent}
          />
          <Pressable onPress={postGreeting}>
            <TextCustom type="link">POST /api/greeting</TextCustom>
          </Pressable>
        </View>
        <Pressable onPress={postGraphql}>
          <TextCustom type="link">POST /api/graphql</TextCustom>
        </Pressable>
      </View>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
      <TextCustom>{'\n'}</TextCustom>
      <HelloWave />
    </ScrollView>
  );
}

import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import clsx from 'clsx';

import DeezerPreviewPlayer from '@/components/DeezerPreviewPlayer';
import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const EventsScreen = () => {
  const [name, setName] = useState('');
  const { theme } = useTheme();

  const fetchGreeting = async () => {
    const response = await fetch('/api/greeting');
    const data = await response.json();
    Notifier.shoot({
      title: 'Greeting',
      message: data.greeting,
      type: 'info',
      position: 'top'
    });
  };

  const postGreeting = async () => {
    const response = await fetch(
      `/api/greeting?name=${encodeURIComponent(name)}`,
      { method: 'POST' }
    );
    const data = await response.json();
    Notifier.shoot({
      message: data.greeting,
      type: 'error',
      position: 'bottom'
    });
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
    Notifier.shoot({
      message: data.data.greeting,
      type: 'success',
      position: 'center'
    });
  };

  return (
    <ScrollView
      //className="flex-1 bg-bg-main"
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
            ? themeColors.dark['bg-main']
            : themeColors.light['bg-main'],
        flexDirection: 'column',
        alignSelf: 'center'
      }}
    >
      <View className="flex-row items-center gap-2">
        <TextCustom type="title">DEEZEROOM APP</TextCustom>
      </View>
      <View className={clsx('flex-1 gap-4 p-4', 'bg-bg-secondary')}>
        <TextCustom type="subtitle">Open an API route</TextCustom>
        <Pressable onPress={fetchGreeting}>
          <TextCustom type="link">GET /api/greeting</TextCustom>
        </Pressable>
        <View className="w-full flex-row items-center gap-2">
          <TextInput
            className="flex-1 rounded border border-accent p-2 text-intent-warning"
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

      <Divider />

      <DeezerPreviewPlayer />
    </ScrollView>
  );
};

export default EventsScreen;

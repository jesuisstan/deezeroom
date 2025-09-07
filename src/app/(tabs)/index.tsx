import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import clsx from 'clsx';

import { HelloWave } from '@/components/HelloWave';
import ButtonCustom from '@/components/ui/ButtonCustom';
import Divider from '@/components/ui/Divider';
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

      <ButtonCustom
        title="PRIMARY"
        size="lg"
        variant="primary"
        fullWidth
        textClassName="tracking-wider"
      />
      <ButtonCustom
        title="OUTLINE"
        size="lg"
        variant="outline"
        fullWidth
        textClassName="tracking-wider"
      />
      <ButtonCustom
        title="SECONDARY"
        size="lg"
        variant="secondary"
        fullWidth
        textClassName="tracking-wider"
      />
      <ButtonCustom
        title="GHOST"
        size="lg"
        variant="ghost"
        fullWidth
        textClassName="tracking-wider"
      />
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

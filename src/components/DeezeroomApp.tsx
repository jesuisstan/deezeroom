import { View } from 'react-native';

import 'react-native-reanimated';

import clsx from 'clsx';
import { Stack } from 'expo-router';

import AuthGuard from '@/components/auth/AuthGuard';
import { useTheme } from '@/providers/ThemeProvider';

const DeezeroomApp = () => {
  const { theme } = useTheme();

  return (
    <AuthGuard>
      <View
        className={clsx('flex-1', theme === 'dark' ? 'bg-black' : 'bg-white')}
      >
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="auth/index"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="auth/email"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="auth/help"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              headerShown: false,
              headerStyle: {
                backgroundColor: '#0f0d13'
              }
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
    </AuthGuard>
  );
};

export default DeezeroomApp;

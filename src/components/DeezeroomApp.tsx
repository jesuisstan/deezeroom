import { View } from 'react-native';

import 'react-native-reanimated';

import clsx from 'clsx';
import { Stack } from 'expo-router';

import AuthGuard from '@/components/auth/AuthGuard';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

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
            name="auth/login"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="auth/register"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="auth/verify-email"
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
                backgroundColor: themeColors[theme]['bg-main']
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

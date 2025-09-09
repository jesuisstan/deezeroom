import 'react-native-reanimated';

import { Stack } from 'expo-router';

import AuthGuard from '@/components/auth/AuthGuard';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

const DeezeroomApp = () => {
  const { theme } = useTheme();

  return (
    <AuthGuard>
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: themeColors[theme]['bg-main']
          },
          headerStyle: {
            backgroundColor: themeColors[theme]['bg-main']
          }
        }}
      >
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
        <Stack.Screen name="profile/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile/settings"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </AuthGuard>
  );
};

export default DeezeroomApp;

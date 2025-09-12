import 'react-native-reanimated';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import AuthGuard from '@/components/auth/AuthGuard';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';

const DeezeroomApp = () => {
  const { theme } = useTheme();
  const { user } = useUser();

  return (
    <AuthGuard>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        translucent={true}
        hidden={false}
      />
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
        {/* Protected screens available to authenticated users */}
        <Stack.Protected guard={user !== null}>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false
            }}
          />

          <Stack.Screen
            name="profile"
            options={{
              headerShown: false
            }}
          />
        </Stack.Protected>

        {/* Protected screens available to unauthenticated users */}
        <Stack.Protected guard={user === null || user === undefined}>
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
        </Stack.Protected>

        {/* Other screens available to all users */}
        <Stack.Screen
          name="auth/verify-email"
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </AuthGuard>
  );
};

export default DeezeroomApp;

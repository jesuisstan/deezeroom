import 'react-native-reanimated';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';

const DeezeroomApp = () => {
  const { theme } = useTheme();
  const { user, profile, loading, profileLoading } = useUser();

  // Show loading indicator while loading
  if (loading || profileLoading) {
    return <ActivityIndicatorScreen />;
  }

  // Determine user state
  const isAuthenticated = !!user;
  const isEmailVerified =
    profile?.emailVerified ?? user?.emailVerified ?? false;

  return (
    <>
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
        {/* Protected screens for authenticated users with verified email */}
        <Stack.Protected guard={isAuthenticated && isEmailVerified}>
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

          <Stack.Screen
            name="player"
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom'
            }}
          />
        </Stack.Protected>

        {/* Protected screens for unauthenticated users */}
        <Stack.Protected guard={!isAuthenticated}>
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
            name="auth/reset-password"
            options={{
              headerShown: false
            }}
          />
        </Stack.Protected>

        {/* Email verification screen for authenticated users with unverified email */}
        <Stack.Protected guard={isAuthenticated && !isEmailVerified}>
          <Stack.Screen
            name="verify-email"
            options={{
              headerShown: false
            }}
          />
        </Stack.Protected>

        {/* Fallback screen */}
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </>
  );
};

export default DeezeroomApp;

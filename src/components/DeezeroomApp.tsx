import 'react-native-reanimated';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import AuthGuard from '@/components/auth/AuthGuard';
import SignOutButton from '@/components/profile/SignOutButton';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

const DeezeroomApp = () => {
  const { theme } = useTheme();
  console.log('theme!!!!!!!!!!!r', theme);
  return (
    <AuthGuard>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor="transparent"
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
          name="profile/index"
          options={{
            title: 'Profile',
            headerShown: true,
            statusBarTranslucent: true,
            headerRight: () => <SignOutButton />,
            headerStyle: {
              backgroundColor: themeColors[theme]['bg-main']
            },
            headerTintColor: themeColors[theme]['text-main'],
            headerTitleStyle: {
              fontFamily: 'LeagueGothic',
              fontSize: 30
            }
          }}
        />
        <Stack.Screen
          name="profile/settings"
          options={{
            title: 'Profile Settings',
            headerShown: true,
            statusBarTranslucent: true,
            headerStyle: {
              backgroundColor: themeColors[theme]['bg-main']
            },
            headerTintColor: themeColors[theme]['text-main'],
            headerTitleStyle: {
              fontFamily: 'LeagueGothic',
              fontSize: 30
            }
          }}
        />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </AuthGuard>
  );
};

export default DeezeroomApp;

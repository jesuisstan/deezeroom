import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { UserProvider } from '@/contexts/UserContext';
import DeezeroomApp from '@/components/DeezeroomApp';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    LeagueGothic: require('@/assets/fonts/LeagueGothic-Regular.ttf'),
    LeagueGothic_Italic: require('@/assets/fonts/LeagueGothic_Italic-Regular.ttf')
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NetworkProvider>
        <UserProvider>
          <DeezeroomApp />
          <StatusBar
            style="dark"
            backgroundColor="transparent"
            translucent={true}
          />
        </UserProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}

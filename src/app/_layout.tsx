import '../global.css';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AlertNotificationRoot } from 'react-native-alert-notification';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { UserProvider } from '@/contexts/UserContext';
import DeezeroomApp from '@/components/DeezeroomApp';
import { Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    LeagueGothic: require('@/assets/fonts/LeagueGothic-Regular.ttf'),
    LeagueGothic_Italic: require('@/assets/fonts/LeagueGothic_Italic-Regular.ttf')
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <ActivityIndicatorScreen />;
  }

  const appContent = (
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

  // For web we don't use AlertNotificationRoot because of problems with useColorScheme
  if (Platform.OS === 'web') {
    return appContent;
  }

  return (
    <AlertNotificationRoot
      toastConfig={{
        autoClose: 3000
      }}
      dialogConfig={{
        closeOnOverlayTap: true,
        autoClose: false
      }}
      theme={colorScheme === 'dark' ? 'dark' : 'light'}
      colors={[
        {
          label: '#fdfcfe',
          card: '#1b191f',
          overlay: '#0000004d',
          success: Colors.dark.accentMain,
          danger: '#ef4444',
          warning: '#f59e0b',
          info: Colors.light.accentMain
        },
        {
          label: '#0f0d13',
          card: '#fdfcfe',
          overlay: '#0000004d',
          success: Colors.dark.accentMain,
          danger: '#ef4444',
          warning: '#f59e0b',
          info: Colors.dark.accentMain
        }
      ]}
    >
      {appContent}
    </AlertNotificationRoot>
  );
}

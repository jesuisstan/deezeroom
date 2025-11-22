import { useEffect } from 'react';

import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel
} from 'react-native-reanimated';
import TrackPlayer from 'react-native-track-player';
import {
  cacheExchange,
  Client as UrqlClient,
  fetchExchange,
  Provider as UrqlProvider
} from 'urql';

import DeezeroomApp from '@/components/DeezeroomApp';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import AlertModule from '@/modules/alert/AlertModule';
import LoggerModule from '@/modules/logger/LoggerModule';
import NotifierModule from '@/modules/notifier/NotifierModule';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { NotificationsProvider } from '@/providers/NotificationsProvider';
import { PlaybackProvider } from '@/providers/PlaybackProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { UserProvider } from '@/providers/UserProvider';
import { PlaybackService } from '@/services/playbackService';

import '@/global.css';

// Register TrackPlayer playback service once at module initialization
TrackPlayer.registerPlaybackService(() => PlaybackService);

const urqlClient = new UrqlClient({
  url: process.env.EXPO_PUBLIC_APP_URL + '/api/graphql',
  exchanges: [cacheExchange, fetchExchange]
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Turn off strict mode for Reanimated warnings globally
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false
});

const RootLayout = () => {
  const [fontsLoaded] = useFonts({
    // League Gothic Variable Font (width variations)
    LeagueGothic: require('@/assets/fonts/LeagueGothic/LeagueGothic-Regular-VariableFont_wdth.ttf'),
    // Inter Variable Fonts (weight and optical size variations)
    Inter: require('@/assets/fonts/Inter/Inter-VariableFont_opsz,wght.ttf'),
    'Inter-Italic': require('@/assets/fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf'),
    'Inter-Bold': require('@/assets/fonts/Inter/Inter_18pt-Bold.ttf'),
    'Inter-SemiBold': require('@/assets/fonts/Inter/Inter_18pt-SemiBold.ttf')
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
    <UrqlProvider value={urqlClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <NetworkProvider>
            <UserProvider>
              <NotificationsProvider>
                <PlaybackProvider>
                  <DeezeroomApp />
                  <LoggerModule />
                  <NotifierModule />
                  <AlertModule />
                </PlaybackProvider>
              </NotificationsProvider>
            </UserProvider>
          </NetworkProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </UrqlProvider>
  );

  return appContent;
};

export default RootLayout;

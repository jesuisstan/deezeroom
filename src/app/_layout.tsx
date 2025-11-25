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
import {
  cacheExchange,
  Client as UrqlClient,
  fetchExchange,
  Provider as UrqlProvider
} from 'urql';

import DeezeroomApp from '@/components/DeezeroomApp';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import { getGraphQLUrl } from '@/graphql/graphql-utils';
import AlertModule from '@/modules/alert/AlertModule';
import LoggerModule from '@/modules/logger/LoggerModule';
import NotifierModule from '@/modules/notifier/NotifierModule';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { NotificationsProvider } from '@/providers/NotificationsProvider';
import { PlaybackProvider } from '@/providers/PlaybackProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { UserProvider } from '@/providers/UserProvider';

import '@/global.css';

// Custom fetch with retry logic for production API stability
const fetchWithRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const maxRetries = 3;
  const timeout = 15000; // 15 seconds (expo hosting cold start can be slow)

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok || attempt === maxRetries - 1) {
        return response;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      // Wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  throw new Error('Max retries exceeded');
};

// Initialize GraphQL client with platform-specific URL and retry logic
const urqlClient = new UrqlClient({
  url: getGraphQLUrl(),
  exchanges: [cacheExchange, fetchExchange],
  fetch: fetchWithRetry
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

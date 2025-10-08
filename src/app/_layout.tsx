import { useEffect } from 'react';
import { Platform } from 'react-native';

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
import AlertModule from '@/modules/alert/AlertModule';
import LoggerModule from '@/modules/logger/LoggerModule';
import NotifierModule from '@/modules/notifier/NotifierModule';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { UserProvider } from '@/providers/UserProvider';

import '@/global.css';

// Определяем правильный URL в зависимости от платформы
const getApiUrl = () => {
  //console.log('Environment check:', {
  //  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  //  Platform: Platform.OS
  //});

  // ВРЕМЕННО: закомментируем проверку переменной окружения для отладки
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log('Using environment variable:', process.env.EXPO_PUBLIC_API_URL);
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Для веб-версии используем localhost
  if (Platform.OS === 'web') {
    console.log('Using web localhost');
    return 'http://localhost:8081';
  }

  // Для мобильных устройств нужно использовать IP адрес компьютера
  // ЗАМЕНИТЕ НА ВАШ IP АДРЕС! Получите командой: ipconfig (Windows) или ifconfig (macOS/Linux)
  console.log('Using mobile IP address');
  return 'http://10.46.190.186:8081';
};

const API_URL = getApiUrl();

// Отладочная информация
console.log(`Platform: ${Platform.OS}`);
console.log(`API URL: ${API_URL}`);

const urqlClient = new UrqlClient({
  url: API_URL + '/api/graphql',
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
              <DeezeroomApp />
              <LoggerModule />
              <NotifierModule />
              <AlertModule />
            </UserProvider>
          </NetworkProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </UrqlProvider>
  );

  return appContent;
};

export default RootLayout;

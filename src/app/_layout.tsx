import { useEffect } from 'react';
import { Platform } from 'react-native';

import 'react-native-reanimated';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AlertNotificationRoot } from 'react-native-alert-notification';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel
} from 'react-native-reanimated';

import DeezeroomApp from '@/components/DeezeroomApp';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { UserProvider } from '@/providers/UserProvider';
import { themeColors } from '@/utils/color-theme';

import '@/global.css';

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
    'Inter-Italic': require('@/assets/fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf')
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
    <ThemeProvider>
      <NetworkProvider>
        <UserProvider>
          <DeezeroomApp />
          <StatusBar
            //style={theme === 'dark' ? 'light' : 'dark'}
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
      colors={[
        {
          label: themeColors.light['text-main'],
          card: themeColors.light['bg-secondary'],
          overlay: themeColors.light['bg-main'],
          success: themeColors.light.primary,
          danger: themeColors.light['intent-error'],
          warning: themeColors.light['intent-warning'],
          info: themeColors.light.primary
        },
        {
          label: themeColors.dark['text-main'],
          card: themeColors.dark['bg-secondary'],
          overlay: themeColors.dark['bg-main'],
          success: themeColors.dark.accent,
          danger: themeColors.dark['intent-error'],
          warning: themeColors.dark['intent-warning'],
          info: themeColors.dark.accent
        }
      ]}
    >
      {appContent}
    </AlertNotificationRoot>
  );
};

export default RootLayout;

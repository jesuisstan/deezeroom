import '../global.css';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AlertNotificationRoot } from 'react-native-alert-notification';
import 'react-native-reanimated';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { UserProvider } from '@/providers/UserProvider';
import DeezeroomApp from '@/components/DeezeroomApp';
import { Platform } from 'react-native';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
          label: themeColors.light.text,
          card: themeColors.light.backgroundSecondary,
          overlay: themeColors.light.background,
          success: themeColors.light.primary,
          danger: themeColors.light.intentError,
          warning: themeColors.light.intentWarning,
          info: themeColors.light.primary
        },
        {
          label: themeColors.dark.text,
          card: themeColors.dark.backgroundSecondary,
          overlay: themeColors.dark.background,
          success: themeColors.dark.accent,
          danger: themeColors.dark.intentError,
          warning: themeColors.dark.intentWarning,
          info: themeColors.dark.accent
        }
      ]}
    >
      {appContent}
    </AlertNotificationRoot>
  );
};

export default RootLayout;

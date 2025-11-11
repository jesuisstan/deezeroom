import { Stack } from 'expo-router';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const NotificationsLayout = () => {
  const { theme } = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Notifications',
          headerShown: true,
          //statusBarTranslucent: true, // UPDATED: value is ignored when using react-native-edge-to-edge
          headerStyle: {
            backgroundColor: themeColors[theme]['primary']
          },
          headerTintColor: themeColors[theme]['text-main'],
          headerTitleStyle: {
            fontFamily: 'LeagueGothic',
            fontSize: 30
          }
        }}
      />
    </Stack>
  );
};

export default NotificationsLayout;

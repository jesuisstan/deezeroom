import { Stack, usePathname } from 'expo-router';

import SignOutButton from '@/components/profile/SignOutButton';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const ProfileLayout = () => {
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        animation: pathname.startsWith('/profile') ? 'default' : 'none'
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Profile',
          headerShown: true,
          //statusBarTranslucent: true, // UPDATED: value is ignored when using react-native-edge-to-edge
          headerRight: () => <SignOutButton />,
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
      <Stack.Screen
        name="settings"
        options={{
          title: 'Profile Settings',
          headerShown: true,
          //statusBarTranslucent: true, // UPDATED: value is ignored when using react-native-edge-to-edge
          headerRight: () => <SignOutButton />,
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

export default ProfileLayout;

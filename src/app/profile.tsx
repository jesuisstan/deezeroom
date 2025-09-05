import { TouchableOpacity, View } from 'react-native';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import ProfileScreen from '@/components/ProfileScreen';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/utils/color-theme';

const SignOutButton = () => {
  const { signOut } = useUser();
  return (
    <TouchableOpacity
      className="bg-accent-main min-w-50 items-center rounded-full px-4 py-2 shadow-lg"
      onPress={signOut}
    >
      <TextCustom className="text-base text-bg-main">Sign Out</TextCustom>
    </TouchableOpacity>
  );
};

const ProfilePage = () => {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor="transparent"
        hidden={true}
      />
      <View className="flex-1 bg-bg-main">
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
            headerRight: () => <SignOutButton />,
            headerStyle: {
              backgroundColor: themeColors.light.accent
            },
            headerTintColor: themeColors.light['bg-main'],
            headerTitleStyle: {
              fontFamily: 'LeagueGothic',
              fontSize: 30
            }
          }}
        />
        <ProfileScreen />
      </View>
    </>
  );
};

export default ProfilePage;

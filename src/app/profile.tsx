import { View, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import ProfileScreen from '@/components/ProfileScreen';
import { useUser } from '@/providers/UserProvider';
import { TextCustom } from '@/components/ui/TextCustom';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

const SignOutButton = () => {
  const { signOut } = useUser();
  return (
    <TouchableOpacity
      className="bg-accent-main px-4 py-2 rounded-full min-w-50 items-center shadow-lg"
      onPress={signOut}
    >
      <TextCustom className="text-bg-main text-base">Sign Out</TextCustom>
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
            headerTintColor: themeColors.light.background,
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

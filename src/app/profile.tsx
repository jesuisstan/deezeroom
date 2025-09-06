import { View } from 'react-native';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import ProfileScreen from '@/components/profile/ProfileScreen';
import SignOutButton from '@/components/profile/SignOutButton';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

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
              backgroundColor: themeColors[theme]['bg-main']
            },
            headerTintColor: themeColors[theme]['text-main'],
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

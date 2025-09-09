import { FC } from 'react';
import { View } from 'react-native';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import ConnectedAccountsSection from '@/components/profile/ConnectedAccountsSection';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/utils/color-theme';

const ProfileSettingsScreen: FC = () => {
  const { theme } = useTheme();
  const { profile } = useUser();

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
            title: 'Profile Settings',
            headerShown: true,
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
        <View className="flex-1 p-4">
          <View className="mt-4">
            {profile ? <ConnectedAccountsSection profile={profile} /> : null}
          </View>
        </View>
      </View>
    </>
  );
};

export default ProfileSettingsScreen;

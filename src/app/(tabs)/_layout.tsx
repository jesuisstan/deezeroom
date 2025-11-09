import { Image, Platform, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';

import NotificationsButton from '@/components/notifications/NotificationsButton';
import MiniPlayer from '@/components/player/MiniPlayer';
import WebPlayerBar from '@/components/player/WebPlayerBar';
import SignOutButton from '@/components/profile/SignOutButton';
import ThemeToggler from '@/components/ThemeToggler';
import { HapticTab } from '@/components/ui/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';

const HeaderRight = () => {
  return (
    <View className="mx-2 flex-row items-center gap-2">
      <ThemeToggler />
      <View className="flex-row items-center">
        <NotificationsButton />
        <SignOutButton />
      </View>
    </View>
  );
};

const TabLayout = () => {
  const { theme } = useTheme();
  const { profile } = useUser();

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: themeColors[theme]['primary'],
          tabBarInactiveTintColor: themeColors[theme]['text-main'],
          headerShown: true,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
              backgroundColor: themeColors[theme]['bg-secondary']
            },
            default: {
              backgroundColor: themeColors[theme]['bg-secondary']
            }
          }),
          headerTitleStyle: {
            fontFamily: 'LeagueGothic',
            letterSpacing: 4,
            fontSize: 30,
            color: themeColors[theme]['text-main']
          },
          headerStyle: {
            backgroundColor: themeColors[theme]['bg-secondary']
          }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="home-search"
                size={28}
                color={color}
              />
            ),
            headerRight: () => <HeaderRight />
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="party-popper"
                size={28}
                color={color}
              />
            ),
            headerRight: () => <HeaderRight />
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: 'Playlists',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="playlist-music"
                size={28}
                color={color}
              />
            ),
            headerRight: () => <HeaderRight />
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) =>
              profile?.photoURL ? (
                <Image
                  source={{ uri: profile.photoURL }}
                  className="h-8 w-8 rounded-full"
                  accessibilityRole="imagebutton"
                />
              ) : (
                <View
                  className="h-8 w-8 items-center justify-center rounded-full border"
                  style={{ borderColor: color }}
                >
                  <TextCustom>
                    {(profile?.displayName || profile?.email || '?')
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </TextCustom>
                </View>
              ),
            headerRight: () => <HeaderRight />
          }}
        />
      </Tabs>
      {Platform.OS === 'web' ? <WebPlayerBar /> : <MiniPlayer />}
    </View>
  );
};

export default TabLayout;

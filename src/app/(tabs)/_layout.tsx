import { Platform, View } from 'react-native';

import Foundation from '@expo/vector-icons/Foundation';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from 'expo-router';

import MiniPlayer from '@/components/player/MiniPlayer';
import ProfileButton from '@/components/profile/ProfileButton';
import ThemeToggler from '@/components/ThemeToggler';
import IconButton from '@/components/ui/buttons/IconButton';
import { HapticTab } from '@/components/ui/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const HeaderRight = () => {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View className="flex-row items-center gap-4">
      <IconButton
        accessibilityLabel="Open player"
        onPress={() => router.push('/player')}
      >
        <MaterialCommunityIcons
          name="music-note-eighth"
          size={22}
          color={themeColors[theme]['text-main']}
        />
      </IconButton>
      <ThemeToggler />
      <ProfileButton />
    </View>
  );
};

const TabLayout = () => {
  const { theme } = useTheme();

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
              <Foundation name="home" size={28} color={color} />
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
      </Tabs>
      <MiniPlayer />
    </View>
  );
};

export default TabLayout;

import { Platform, View } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import { Tabs } from 'expo-router';

import ProfileButton from '@/components/profile/ProfileButton';
import ThemeToggler from '@/components/ThemeToggler';
import { HapticTab } from '@/components/ui/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const HeaderRight = () => {
  return (
    <View className="flex-row items-center gap-4">
      <ThemeToggler />
      <ProfileButton />
    </View>
  );
};

const TabLayout = () => {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors.dark.primary,
        tabBarInactiveTintColor:
          theme === 'dark'
            ? themeColors.dark['text-main']
            : themeColors.light['text-main'],
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
            backgroundColor:
              theme === 'dark'
                ? themeColors.dark['bg-secondary']
                : themeColors.light['bg-secondary']
          },
          default: {
            backgroundColor:
              theme === 'dark'
                ? themeColors.dark['bg-secondary']
                : themeColors.light['bg-secondary']
          }
        }),
        headerTitleStyle: {
          fontFamily: 'LeagueGothic',
          letterSpacing: 4,
          fontSize: 30,
          color:
            theme === 'dark'
              ? themeColors.dark['text-main']
              : themeColors.light['text-main']
        },
        headerStyle: {
          backgroundColor:
            theme === 'dark'
              ? themeColors.dark['bg-secondary']
              : themeColors.light['bg-secondary']
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <AntDesign name="home" size={28} color={color} />
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
            <SimpleLineIcons name="playlist" size={28} color={color} />
          ),
          headerRight: () => <HeaderRight />
        }}
      />
    </Tabs>
  );
};

export default TabLayout;

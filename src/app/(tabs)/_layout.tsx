import { Platform, View } from 'react-native';

import { Tabs } from 'expo-router';

import ProfileButton from '@/components/profile/ProfileButton';
import ThemeToggler from '@/components/ThemeToggler';
import { HapticTab } from '@/components/ui/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

const HeaderRight = () => {
  return (
    <View className="flex-row items-center gap-4">
      <ThemeToggler />
      <ProfileButton />
    </View>
  );
};

export default function TabLayout() {
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
            <IconSymbol size={28} name="shippingbox.fill" color={color} />
          ),
          headerRight: () => <HeaderRight />
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
          headerRight: () => <HeaderRight />
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="shippingbox.fill" color={color} />
          ),
          headerRight: () => <HeaderRight />
        }}
      />
    </Tabs>
  );
}

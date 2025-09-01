import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { HapticTab } from '@/components/ui/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeProvider';
import ProfileButton from '@/components/ProfileButton';

const HeaderRight = () => {
  return (
    <View className="flex-row items-center gap-4">
      <ThemeToggle />
      <ProfileButton />
    </View>
  );
};

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme === 'dark' ? '#ff00Ff' : '#0a7ea4',
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute'
          },
          default: {}
        }),
        headerTitleStyle: {
          fontFamily: 'LeagueGothic',
          fontSize: 30
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

import { View, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import ProfileScreen from '@/components/ProfileScreen';
import { useUser } from '@/contexts/UserContext';
import { ThemedText } from '@/components/ui/ThemedText';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';

const SignOutButton = () => {
  const { signOut } = useUser();
  return (
    <TouchableOpacity
      className="bg-accent-main px-4 py-2 rounded-full min-w-50 items-center shadow-lg"
      onPress={signOut}
    >
      <ThemedText className="text-bg-main text-base">Sign Out</ThemedText>
    </TouchableOpacity>
  );
};

export default function ProfilePage() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" hidden={true} />
      <View className="flex-1 bg-bg-main">
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
            headerRight: () => <SignOutButton />,
            headerStyle: {
              backgroundColor: Colors.light.accentWeak
            },
            headerTintColor: Colors.light.background,
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
}

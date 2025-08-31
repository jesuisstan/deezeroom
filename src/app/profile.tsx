import { View, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import UserProfileScreen from '@/components/UserProfile';
import { useUser } from '@/contexts/UserContext';
import { ThemedText } from '@/components/ui/ThemedText';
import { StatusBar } from 'expo-status-bar';

const SignOutButton = () => {
  const { signOut } = useUser();
  return (
    <TouchableOpacity onPress={signOut} className="mr-4">
      <ThemedText className="text-blue-500 text-base">Sign Out</ThemedText>
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
              backgroundColor: '#fdfcfe'
            },
            headerTintColor: '#a238ff',
            headerTitleStyle: {
              fontFamily: 'LeagueGothic',
              fontSize: 30
            }
          }}
        />
        <UserProfileScreen />
      </View>
    </>
  );
}

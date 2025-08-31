import { View, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import ProfileScreen from '@/components/ProfileScreen';
import { useUser } from '@/contexts/UserContext';
import { StatusBar } from 'expo-status-bar';
import { LogOut } from 'lucide-react-native';

const SignOutButton = () => {
  const { signOut } = useUser();
  return (
    <TouchableOpacity onPress={signOut} className="mr-4 p-2">
      <LogOut size={22} color="#a238ff" />
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
        <ProfileScreen />
      </View>
    </>
  );
}

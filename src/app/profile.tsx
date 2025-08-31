import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import UserProfileScreen from '@/components/UserProfile';
import { Colors } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { ThemedText } from '@/components/ui/ThemedText';
import { StatusBar } from 'expo-status-bar';

const SignOutButton = () => {
  const { signOut } = useUser();
  return (
    <TouchableOpacity onPress={signOut} style={{ marginRight: 16 }}>
      <ThemedText style={{ color: '#009BFF', fontSize: 16 }}>
        Sign Out
      </ThemedText>
    </TouchableOpacity>
  );
};

export default function ProfilePage() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" hidden={true} />
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
            headerRight: () => <SignOutButton />,
            headerStyle: {
              backgroundColor: Colors.light.text
            },
            headerTintColor: Colors.light.accentMain,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background
  }
});

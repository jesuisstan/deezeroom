import 'react-native-reanimated';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useUser } from '@/providers/UserProvider';
import LoginScreen from '@/components/LoginScreen';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';

const DeezeroomApp = () => {
  const { user, loading } = useUser();

  // Show loading while checking authentication state
  if (loading) {
    return <ActivityIndicatorScreen />;
  }

  return (
    <View className="flex-1 bg-bg-main">
      {!user ? (
        <LoginScreen />
      ) : (
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="profile"
            options={{
              headerShown: false,
              headerStyle: {
                backgroundColor: '#0f0d13'
              }
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      )}
    </View>
  );
};

export default DeezeroomApp;

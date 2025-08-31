import 'react-native-reanimated';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Stack } from 'expo-router';

import { useUser } from '@/contexts/UserContext';
import { Colors } from '@/constants/Colors';
import LoginScreen from '@/components/LoginScreen';
import { ThemedText } from '@/components/ui/ThemedText';

const DeezeroomApp = () => {
  const { user, loading, signOut } = useUser();

  // Show loading while checking authentication state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar
          animated={true}
          backgroundColor={Colors.light.bgTtransparent}
          barStyle="dark-content"
          showHideTransition="slide"
          hidden={false}
        />
        <ThemedText type="title">Loading...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        animated={true}
        backgroundColor={Colors.light.bgTtransparent}
        barStyle="dark-content"
        showHideTransition="slide"
        hidden={false}
      />
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
          <Stack.Screen name="+not-found" />
        </Stack>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background
  }
});

export default DeezeroomApp;

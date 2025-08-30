import { FC, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/utils/firebase';
import { useUser } from '@/contexts/UserContext';
import shootAlert from '@/utils/shoot-alert';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/Colors';

const LoginScreen: FC = () => {
  const { setUser } = useUser();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID, // Web / Expo Client
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID, // iOS
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID // Android
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(({ user }) => setUser(user))
        .catch(() => shootAlert('Oops!', 'Error signing in with Google.'));
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/favicon.png')}
        style={{ width: 50, height: 50 }}
      />
      <ThemedText type="subtitle">Welcome to your</ThemedText>
      <ThemedText type="title">DEEZEROOM</ThemedText>
      <View style={{ width: 192, height: 48 }}>
        <ThemedText onPress={() => promptAsync()}>
          Sign in with Google
        </ThemedText>
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 21
  }
});

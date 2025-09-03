import { FC } from 'react';
import { View, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/utils/firebase-init';
import shootAlert from '@/utils/shoot-alert';
import { TextCustom } from '@/components/ui/TextCustom';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode
} from '@react-native-google-signin/google-signin';
import ThemeToggle from '@/components/ThemeToggle';
import { Text } from 'react-native';
import VideoBanner from '@/components/VideoBanner';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/providers/ThemeProvider';

const LoginScreen: FC = () => {
  // Google Sign-In is already configured in UserContext in UserProvider.tsx

  const handleGoogleSignIn = async () => {
    try {
      console.log('Starting Google sign in');

      // Check Play Services (for Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }

      // Perform sign in
      const userInfo = await GoogleSignin.signIn();
      console.log('Google sign-in successful:', userInfo);

      // Get ID token from Google for Firebase
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        console.error('No idToken received');
        shootAlert('toast', 'Error', 'No token received from Google', 'error');
        return;
      }

      // Create Firebase credential from Google ID token with GoogleAuthProvider ("translates" Google ID token to Firebase credential)
      const credential = GoogleAuthProvider.credential(idToken);
      console.log('Created Firebase credential');

      // Sign in to Firebase with Google credential
      await signInWithCredential(auth, credential);
      console.log('Firebase sign-in successful');

      // Profile will be automatically created/loaded in UserContext in UserProvider.tsx
      shootAlert(
        'toast',
        'Success',
        'You have successfully signed in!',
        'success'
      );
    } catch (error) {
      console.error('Google sign-in error:', error);

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('User cancelled the sign-in flow');
            break;
          case statusCodes.IN_PROGRESS:
            console.log('Sign-in is already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            shootAlert(
              'toast',
              'Error',
              'Google Play Services not available',
              'error'
            );
            break;
          default:
            shootAlert(
              'toast',
              'Sign in error',
              'Failed to sign in with Google. Please try again.',
              'error'
            );
        }
      } else {
        shootAlert(
          'toast',
          'Sign in error',
          'Failed to sign in with Google. Please try again.',
          'error'
        );
      }
    }
  };
  const { theme } = useTheme();

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor="transparent"
        hidden={true}
      />
      <VideoBanner
        videoSource={require('@/assets/videos/welcome-screen-construction.mp4')}
        className="bg-black"
      />

      <View className="flex-1 bg-background items-center justify-center p-5 gap-6">
        <Text className="text-intent-success text-2xl font-semibold">
          Sign in
        </Text>
        <TouchableOpacity
          className="bg-secondary px-8 py-4 rounded-full min-w-50 items-center shadow-lg"
          onPress={handleGoogleSignIn}
        >
          <TextCustom className="text-intent-warning text-2xl font-semibold">
            Sign in with Google
          </TextCustom>
        </TouchableOpacity>
        <ThemeToggle />
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

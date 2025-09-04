import { FC } from 'react';
import { Image, Platform, TouchableOpacity, View } from 'react-native';

import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes
} from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import ThemeToggle from '@/components/ThemeToggle';
import Button from '@/components/ui/Button';
import { TextCustom } from '@/components/ui/TextCustom';
import VideoBanner from '@/components/VideoBanner';
import { useTheme } from '@/providers/ThemeProvider';
import { auth } from '@/utils/firebase-init';
import shootAlert from '@/utils/shoot-alert';

const LoginScreen: FC = () => {
  // Google Sign-In is configured in UserContext in UserProvider.tsx

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
  const router = useRouter();

  const handleEmailContinue = () => {
    console.log('handleEmailContinue pressed'); // debug
    router.push('/auth/email');
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor="transparent"
        hidden={true}
      />
      {/* Top half: banner/cover */}
      <View className="flex-1 bg-black">
        <VideoBanner
          videoSource={require('@/assets/videos/welcome-screen-construction.mp4')}
          className="bg-black"
        />
      </View>

      {/* Bottom half: authentication block in Deezer style */}
      <View className="flex-1 justify-between bg-background p-4">
        <View className="gap-3">
          <TextCustom className="text-lg text-secondary opacity-70">
            Sign up for free or log in
          </TextCustom>

          {/* Continue with email */}
          <Button
            title="Continue with email"
            onPress={handleEmailContinue}
            size="md"
            variant="primary"
            fullWidth
            textClassName="tracking-wider"
          />

          {/* Divider */}
          <View className="items-center">
            <TextCustom className="text-lg text-secondary opacity-70">
              or
            </TextCustom>
          </View>

          {/* Google button */}
          <View className="flex-row items-center justify-center">
            <TouchableOpacity
              className="bg-backgroundSecondary h-14 w-14 items-center justify-center rounded-full border border-border"
              onPress={handleGoogleSignIn}
            >
              <Image
                source={{
                  uri: 'https://img.icons8.com/color/48/google-logo.png'
                }}
                style={{ width: 26, height: 26 }}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="m-4 items-center">
          <ThemeToggle />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

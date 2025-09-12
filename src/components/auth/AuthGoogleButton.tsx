import { FC, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  View
} from 'react-native';

import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes
} from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { auth } from '@/utils/firebase/firebase-init';
import shootAlert from '@/utils/shoot-alert';

const AuthGoogleButton: FC = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { theme } = useTheme();

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return; // Prevent multiple simultaneous requests

    setIsGoogleLoading(true);
    try {
      console.log('Starting Google sign in');

      // Check Play Services (for Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }

      // Perform sign in
      const result = await GoogleSignin.signIn();
      if (result.type === 'success') {
        console.log('Google sign-in successful');
      } else {
        console.log('Google sign-in failed');
      }

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
    } catch (error) {
      console.log('Google sign-in error:', error);

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
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View className="h-14 w-14 overflow-hidden rounded-full border border-border bg-bg-main">
      <Pressable
        android_ripple={{
          color: themeColors[theme]['border'],
          borderless: false
        }}
        accessibilityRole="button"
        hitSlop={8}
        className="flex-1 items-center justify-center"
        onPress={handleGoogleSignIn}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <ActivityIndicator size="small" color={themeColors[theme].primary} />
        ) : (
          <Image
            source={require('@/assets/images/others/logo-google.png')}
            style={{ width: 26, height: 26 }}
          />
        )}
      </Pressable>
    </View>
  );
};

export default AuthGoogleButton;

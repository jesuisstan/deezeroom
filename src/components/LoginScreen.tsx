import { FC } from 'react';
import { View, Image, Platform, TouchableOpacity } from 'react-native';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/utils/firebase';
import { UserService } from '@/utils/firebaseService';
import shootAlert from '@/utils/shoot-alert';
import { ThemedText } from '@/components/ui/ThemedText';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode
} from '@react-native-google-signin/google-signin';

const LoginScreen: FC = () => {
  // Google Sign-In is already configured in UserContext

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

      // Get ID token for Firebase
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        console.error('No idToken received');
        shootAlert('toast', 'Error', 'No token received from Google', 'error');
        return;
      }

      // Create Firebase credential
      const credential = GoogleAuthProvider.credential(idToken);
      console.log('Created Firebase credential');

      // Sign in to Firebase
      const { user } = await signInWithCredential(auth, credential);
      console.log('Firebase sign-in successful:', user);

      // Create user profile
      try {
        await UserService.createOrUpdateUser(user, {
          musicPreferences: {
            favoriteGenres: [],
            favoriteArtists: []
          }
        });
        shootAlert(
          'toast',
          'Success',
          'You have successfully signed in!',
          'success'
        );
      } catch (error) {
        console.error('Error creating user profile:', error);
        shootAlert(
          'toast',
          'Warning',
          'Sign in completed, but failed to create profile.',
          'warning'
        );
      }
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
              'Failed to sign in with Google. Please try again.'
            );
        }
      } else {
        shootAlert(
          'toast',
          'Sign in error',
          'Failed to sign in with Google. Please try again.'
        );
      }
    }
  };

  return (
    <View className="flex-1 bg-bg-main items-center justify-center p-5">
      <View className="mb-10 items-center">
        <Image
          source={require('@/assets/images/logo/deezeroom-white-transparent.png')}
          className="w-96"
          resizeMode="contain"
        />
      </View>

      <TouchableOpacity
        className="bg-accent-main px-8 py-4 rounded-full min-w-50 items-center shadow-lg"
        onPress={handleGoogleSignIn}
      >
        <ThemedText className="text-bg-main text-base font-semibold">
          Sign in with Google
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;

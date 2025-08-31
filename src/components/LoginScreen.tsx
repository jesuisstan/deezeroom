import { FC, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Platform,
  TouchableOpacity
} from 'react-native';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/utils/firebase';
import { UserService } from '@/utils/firebaseService';
import shootAlert from '@/utils/shoot-alert';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/Colors';
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
        shootAlert('Error', 'No token received from Google');
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
        shootAlert('Success', 'You have successfully signed in!');
      } catch (error) {
        console.error('Error creating user profile:', error);
        shootAlert(
          'Warning',
          'Sign in completed, but failed to create profile.'
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
            shootAlert('Error', 'Google Play Services not available');
            break;
          default:
            shootAlert(
              'Sign in error',
              'Failed to sign in with Google. Please try again.'
            );
        }
      } else {
        shootAlert(
          'Sign in error',
          'Failed to sign in with Google. Please try again.'
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/logo/deezeroom-white-transparent.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <TouchableOpacity
        style={styles.signInButton}
        onPress={handleGoogleSignIn}
      >
        <ThemedText style={styles.signInButtonText}>
          Sign in with Google
        </ThemedText>
      </TouchableOpacity>
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
    padding: 20
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center'
  },
  logo: {
    width: 300
  },
  signInButton: {
    backgroundColor: Colors.light.accentMain,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  signInButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600'
  }
});

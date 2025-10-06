import { FC, useState } from 'react';
import { Image, Platform } from 'react-native';

import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth';

import IconButton from '@/components/ui/buttons/IconButton';
import { Logger } from '@/modules/logger/LoggerModule';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { auth } from '@/utils/firebase/firebase-init';

const AuthGoogleButton: FC = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { theme } = useTheme();

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return; // Prevent multiple simultaneous requests

    setIsGoogleLoading(true);
    try {
      Logger.info('Starting Google sign in', null, '🥽 AuthGoogleButton');

      if (Platform.OS === 'web') {
        // Web flow: use Firebase Auth popup (fallback to redirect if blocked)
        const provider = new GoogleAuthProvider();
        try {
          await signInWithPopup(auth, provider);
        } catch (err: any) {
          const message = String(err?.message || '');
          if (
            err?.code === 'auth/popup-blocked' ||
            err?.code === 'auth/popup-closed-by-user' ||
            message.includes('Cross-Origin-Opener-Policy')
          ) {
            await signInWithRedirect(auth, provider);
          } else {
            throw err;
          }
        }
        Logger.info(
          'Firebase web sign-in initiated',
          null,
          '🥽 AuthGoogleButton'
        );
      } else {
        // Native (iOS/Android) flow using Google Sign-In
        const { GoogleSignin } = await import(
          '@react-native-google-signin/google-signin'
        );

        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices();
        }

        // Force account chooser by clearing previous Google session
        try {
          await GoogleSignin.signOut();
        } catch {}

        const result = await GoogleSignin.signIn();
        if (result.type === 'success') {
          Logger.info('Google sign-in successful', null, '🥽 AuthGoogleButton');
        } else {
          Logger.error('Google sign-in failed', null, '🥽 AuthGoogleButton');
        }

        const { idToken } = await GoogleSignin.getTokens();
        if (!idToken) {
          Logger.error('No idToken received', null, '🥽 AuthGoogleButton');
          Notifier.shoot({
            type: 'error',
            title: 'Error',
            message: 'No token received from Google.'
          });
          return;
        }

        // Create Firebase credential from Google ID token with GoogleAuthProvider ("translates" Google ID token to Firebase credential)
        const credential = GoogleAuthProvider.credential(idToken);
        // Sign in to Firebase with Google credential
        await signInWithCredential(auth, credential);
        Logger.info(
          'Firebase native sign-in successful',
          null,
          '🥽 AuthGoogleButton'
        );
      }

      // Profile will be automatically created/loaded in UserContext in UserProvider.tsx
    } catch (error) {
      Logger.error('Google sign-in error', error, '🥽 AuthGoogleButton');
      // Try to map common native errors when module is available; otherwise show generic
      if (Platform.OS !== 'web') {
        try {
          const { isErrorWithCode, statusCodes } = await import(
            '@react-native-google-signin/google-signin'
          );
          if (isErrorWithCode(error)) {
            switch ((error as any).code) {
              case statusCodes.SIGN_IN_CANCELLED:
                Logger.info(
                  'User cancelled the sign-in flow',
                  null,
                  '🥽 AuthGoogleButton'
                );
                return;
              case statusCodes.IN_PROGRESS:
                Logger.info(
                  'Sign-in is already in progress',
                  null,
                  '🥽 AuthGoogleButton'
                );
                return;
              case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                Notifier.shoot({
                  type: 'error',
                  title: 'Error',
                  message: 'Google Play Services not available'
                });
                return;
              default:
                break;
            }
          }
        } catch {}
      }

      Notifier.shoot({
        type: 'error',
        title: 'Sign in error',
        message: 'Failed to sign in with Google. Please try again.'
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <IconButton
      accessibilityLabel="Log in with Google"
      onPress={handleGoogleSignIn}
      loading={isGoogleLoading}
      className="h-14 w-14 border border-border bg-bg-main"
      backgroundColor={themeColors[theme]['bg-main']}
    >
      <Image
        source={require('@/assets/images/others/logo-google.png')}
        style={{ width: 26, height: 26 }}
      />
    </IconButton>
  );
};

export default AuthGoogleButton;

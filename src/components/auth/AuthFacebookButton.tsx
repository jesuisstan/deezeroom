import { FC, useState } from 'react';
import { Image, Platform } from 'react-native';

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { FacebookAuthProvider, signInWithCredential } from 'firebase/auth';

import IconButton from '@/components/ui/buttons/IconButton';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { getFirebaseErrorMessage } from '@/utils/firebase/firebase-error-handler';
import { auth } from '@/utils/firebase/firebase-init';
import { UserService } from '@/utils/firebase/firebase-service-user';

WebBrowser.maybeCompleteAuthSession();

interface AuthFacebookButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

const AuthFacebookButton: FC<AuthFacebookButtonProps> = ({
  onSuccess,
  onError,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleFacebookSignIn = async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      console.log('Starting Facebook sign in');

      if (Platform.OS === 'web') {
        // Web flow: use AuthSession
        const redirectUri = AuthSession.makeRedirectUri();

        const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
        if (!facebookAppId) {
          throw new Error('Facebook App ID not configured');
        }

        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&scope=email,public_profile`;

        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          redirectUri
        );

        if (result.type === 'success' && result.url) {
          // Extract code from URL
          const url = new URL(result.url);
          const code = url.searchParams.get('code');

          if (!code) {
            throw new Error('No authorization code received');
          }

          // Exchange code for access token
          const tokenResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(
              redirectUri
            )}&client_secret=${process.env.EXPO_PUBLIC_FACEBOOK_APP_SECRET}&code=${code}`
          );

          const tokenData = await tokenResponse.json();

          if (tokenData.access_token) {
            // Get user info from Facebook
            const userInfoResponse = await fetch(
              `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`
            );
            const userInfo = await userInfoResponse.json();

            // Create Facebook credential
            const credential = FacebookAuthProvider.credential(
              tokenData.access_token
            );

            // Sign in with Firebase
            const userCredential = await signInWithCredential(auth, credential);

            // Create or update user profile
            await UserService.createOrUpdateUser(userCredential.user, {
              emailVerified: !!userCredential.user.emailVerified,
              displayName: userInfo.name || userCredential.user.displayName,
              photoURL: `https://graph.facebook.com/${userInfo.id}/picture?type=large`
            });

            console.log('Facebook web sign-in successful');
            Notifier.shoot({
              type: 'success',
              title: 'Success',
              message: 'Successfully signed in with Facebook!'
            });
            onSuccess?.();
          } else {
            throw new Error('Failed to get Facebook access token');
          }
        } else if (result.type === 'cancel') {
          console.log('User cancelled Facebook sign-in');
          return;
        } else {
          throw new Error('Facebook authentication failed');
        }
      } else {
        // Native flow - пока не реализован
        Notifier.shoot({
          type: 'error',
          title: 'Not supported',
          message: 'Facebook sign-in is not yet supported on mobile devices'
        });
        return;
      }
    } catch (error: any) {
      console.error('Facebook sign-in error:', error);
      const errorMessage =
        getFirebaseErrorMessage(error) || 'Facebook sign-in failed';
      Notifier.shoot({
        type: 'error',
        title: 'Sign in error',
        message: errorMessage
      });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IconButton
      accessibilityLabel="Log in with Facebook"
      onPress={handleFacebookSignIn}
      loading={loading}
      disabled={disabled}
      className="h-14 w-14 border border-border bg-bg-main"
      backgroundColor={themeColors[theme]['bg-main']}
    >
      <Image
        source={require('@/assets/images/others/logo-facebook.png')}
        style={{ width: 35, height: 35 }}
      />
    </IconButton>
  );
};

export default AuthFacebookButton;

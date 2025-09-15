import { FC, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useRouter } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import HelpButton from '@/components/auth/HelpButton';
import ButtonRipple from '@/components/ui/ButtonRipple';
import RouterBackButton from '@/components/ui/RouterBackButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useUser } from '@/providers/UserProvider';
import { getFirebaseErrorMessage } from '@/utils/firebase/firebase-error-handler';
import { auth } from '@/utils/firebase/firebase-init';
import shootAlert from '@/utils/shoot-alert';

const VerifyEmailScreen: FC = () => {
  const router = useRouter();
  const { user, signOut, refreshProfile } = useUser();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    try {
      setSending(true);
      await sendEmailVerification(auth.currentUser);
      shootAlert(
        'toast',
        'Verification email sent',
        'Please check your inbox.',
        'success'
      );
    } catch (error: any) {
      console.log('sendEmailVerification error:', error);
      const errorMessage = getFirebaseErrorMessage(error);
      shootAlert(
        'toast',
        'Error',
        errorMessage || 'Failed to send verification email',
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  const handleIHaveVerified = async () => {
    if (!auth.currentUser) return;
    try {
      setChecking(true);
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        shootAlert('toast', 'Email verified', 'Welcome!', 'success');
        try {
          await refreshProfile();
        } catch {}
        router.replace('/(tabs)');
      } else {
        shootAlert(
          'toast',
          'Not verified yet',
          'Please check your email.',
          'warning'
        );
      }
    } catch (e) {
      console.log('reload error', e);
      console.log(JSON.stringify(e));
      const errorMessage = getFirebaseErrorMessage(e);
      shootAlert(
        'toast',
        'Error',
        errorMessage || 'Failed to check verification status',
        'error'
      );
    } finally {
      setChecking(false);
    }
  };

  const handleBack = async () => {
    // Sign out and return to auth since user is not verified
    try {
      await signOut();
    } finally {
      router.replace('/auth');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-main" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-6 py-6"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Header with back and help buttons */}
        <View className="flex-row items-center justify-between">
          {/* Back button signs out user and returns to auth */}
          <RouterBackButton onPress={handleBack} />
          <HelpButton />
        </View>

        <View className="items-center">
          <TextCustom type="title">Verify your email</TextCustom>
        </View>
        <View>
          <TextCustom>We've sent a verification link to:</TextCustom>
          <TextCustom type="bold">{user?.email}</TextCustom>
          <TextCustom>
            Open the link from your email to complete verification.
          </TextCustom>
        </View>

        <View className="gap-4">
          <ButtonRipple
            fullWidth
            title="Resend verification email"
            size="lg"
            onPress={handleResend}
            loading={sending}
          />
          <ButtonRipple
            fullWidth
            title="I have verified"
            size="lg"
            onPress={handleIHaveVerified}
            loading={checking}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VerifyEmailScreen;

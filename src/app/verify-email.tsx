import { FC, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useRouter } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import HelpButton from '@/components/auth/need-help/NeedHelp';
import RippleButton from '@/components/ui/buttons/RippleButton';
import RouterBackButton from '@/components/ui/buttons/RouterBackButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Logger } from '@/modules/logger/LoggerModule';
import { Notifier } from '@/modules/notifier';
import { useUser } from '@/providers/UserProvider';
import { getFirebaseErrorMessage } from '@/utils/firebase/firebase-error-handler';
import { auth } from '@/utils/firebase/firebase-init';

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
      Notifier.shoot({
        type: 'info',
        title: 'Verification email sent',
        message: 'Please check your inbox.'
      });
    } catch (error: any) {
      Logger.error('sendEmailVerification error', error, 'VerifyEmailScreen');
      const errorMessage = getFirebaseErrorMessage(error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: errorMessage || 'Failed to send verification email.'
      });
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
        Notifier.shoot({
          type: 'success',
          title: 'Email verified',
          message: 'Welcome!'
        });
        try {
          await refreshProfile();
        } catch {}
        router.replace('/(tabs)');
      } else {
        Notifier.shoot({
          type: 'warn',
          title: 'Not verified yet',
          message: 'Please check your email.'
        });
      }
    } catch (e) {
      Logger.error('reload error', JSON.stringify(e), 'VerifyEmailScreen');
      const errorMessage = getFirebaseErrorMessage(e);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: errorMessage || 'Failed to check verification status.'
      });
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

        <TextCustom type="title" size="4xl" className="text-center">
          Verify your email
        </TextCustom>

        <View>
          <TextCustom>We've sent a verification link to:</TextCustom>
          <TextCustom type="bold">{user?.email}</TextCustom>
          <TextCustom>
            Open the link from your email to complete verification.
          </TextCustom>
        </View>

        <View className="gap-4">
          <RippleButton
            fullWidth
            title="Resend verification email"
            size="lg"
            onPress={handleResend}
            loading={sending}
          />
          <RippleButton
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

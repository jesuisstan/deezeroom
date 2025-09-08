import { FC, useState } from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { sendEmailVerification } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import RouterBackButton from '@/components/RouterBackButton';
import ButtonCustom from '@/components/ui/ButtonCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { auth } from '@/utils/firebase-init';
import shootAlert from '@/utils/shoot-alert';

const VerifyEmailScreen: FC = () => {
  const { theme } = useTheme();
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
    } catch (e) {
      console.log('sendEmailVerification error', e);
      shootAlert(
        'toast',
        'Error',
        'Failed to send verification email',
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
      shootAlert(
        'toast',
        'Error',
        'Failed to check verification status',
        'error'
      );
    } finally {
      setChecking(false);
    }
  };

  const handleBack = async () => {
    try {
      await signOut();
    } finally {
      router.replace('/auth');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-main" edges={['top', 'bottom']}>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor="transparent"
        hidden={false}
      />
      <View className="flex-1 gap-4 px-6 py-6">
        <View className="flex-row items-center justify-between">
          <RouterBackButton onPress={handleBack} />
        </View>

        <View className="items-center">
          <TextCustom type="title">Verify your email</TextCustom>
        </View>
        <View className="gap-4">
          <TextCustom>We sent a verification link to:</TextCustom>
          <TextCustom type="bold">{user?.email}</TextCustom>
          <TextCustom>
            Open the link from your email to complete verification.
          </TextCustom>
        </View>

        <View className="gap-4">
          <ButtonCustom
            title="Resend verification email"
            size="lg"
            onPress={handleResend}
            loading={sending}
            fullWidth
          />
          <ButtonCustom
            title="I have verified"
            size="lg"
            onPress={handleIHaveVerified}
            loading={checking}
            fullWidth
            variant="secondary"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default VerifyEmailScreen;

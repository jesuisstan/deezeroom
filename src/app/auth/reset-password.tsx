import { FC, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import HelpButton from '@/components/auth/HelpButton';
import ButtonRipple from '@/components/ui/ButtonRipple';
import InputCustom from '@/components/ui/InputCustom';
import LinkCustom from '@/components/ui/LinkCustom';
import RouterBackButton from '@/components/ui/RouterBackButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { getFirebaseErrorMessage } from '@/utils/firebase/firebase-error-handler';
import { auth } from '@/utils/firebase/firebase-init';
import shootAlert from '@/utils/shoot-alert';

const ResetPasswordScreen: FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  const validateEmail = (emailToCheck: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToCheck);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handleResetPassword = async () => {
    const normalized = email.trim().toLowerCase();

    if (!validateEmail(normalized)) {
      setEmailError('The format of your email address is not valid');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalized);
      setIsEmailSent(true);
    } catch (error: any) {
      console.log('Reset password error:', error);
      const errorMessage = getFirebaseErrorMessage(error);
      setEmailError(errorMessage || 'Failed to send reset email');
      shootAlert(
        'toast',
        'Error',
        errorMessage || 'Failed to send reset email. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/auth/login');
  };

  if (isEmailSent) {
    return (
      <SafeAreaView className="flex-1 bg-bg-main" edges={['top', 'bottom']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-6 py-6"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Header with back and help buttons */}
          <View className="flex-row items-center justify-between">
            <RouterBackButton onPress={handleBackToLogin} />
            <HelpButton />
          </View>

          <TextCustom type="title" size="4xl" className="text-center">
            Check your email
          </TextCustom>

          <View>
            <TextCustom>We've sent a password reset link to:</TextCustom>
            <TextCustom type="bold">{email}</TextCustom>
            <TextCustom>
              Follow the instructions in the email to reset your password.
            </TextCustom>
          </View>

          <View className="self-center">
            <LinkCustom
              href="/auth/login"
              params={{ email }}
              text="Back to login"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-main" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 px-6 py-6"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            {/* Header with back and help buttons */}
            <View className="flex-row items-center justify-between">
              <RouterBackButton />
              <HelpButton />
            </View>

            <TextCustom type="title" size="4xl" className="text-center">
              Reset password
            </TextCustom>

            <View className="gap-2">
              <TextCustom>
                Enter your email address and we'll send you a link to reset your
                password.
              </TextCustom>
            </View>

            <InputCustom
              key="email"
              placeholder="Email address"
              keyboardType="email-address"
              textContentType="emailAddress"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={handleEmailChange}
              onClear={() => {
                setEmail('');
                setEmailError('');
              }}
              showClearButton={true}
              autoFocus={true}
              errorText={emailError}
              leftIconName="mail"
            />

            <ButtonRipple
              fullWidth
              title="Send reset email"
              size="lg"
              onPress={handleResetPassword}
              loading={loading}
              disabled={loading || !email.trim()}
            />

            <View className="self-center">
              <LinkCustom
                href="/auth/login"
                params={{ email }}
                text="Back to login"
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;

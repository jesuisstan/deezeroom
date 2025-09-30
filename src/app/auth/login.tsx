import { FC, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import NeedHelp from '@/components/auth/need-help/NeedHelp';
import LinkCustom from '@/components/ui/buttons/LinkCustom';
import RippleButton from '@/components/ui/buttons/RippleButton';
import RouterBackButton from '@/components/ui/buttons/RouterBackButton';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { Notifier } from '@/modules/notifier';
import { getFirebaseErrorMessage } from '@/utils/firebase/firebase-error-handler';
import { auth } from '@/utils/firebase/firebase-init';

const LoginScreen: FC = () => {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState((params?.email || '').toString());
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (emailToCheck: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToCheck);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
  };

  const handleSubmit = async () => {
    const normalized = email.trim().toLowerCase();
    if (!validateEmail(normalized)) {
      setEmailError('The format of your email address is not valid');
      return;
    }
    if (password.length === 0) {
      setPasswordError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, normalized, password);
      // AuthGuard redirect to /(tabs)
    } catch (err: any) {
      const errorMessage = getFirebaseErrorMessage(err);
      console.log('Error on login:', errorMessage);
      Notifier.shoot({
        type: 'error',
        title: 'Sign in error',
        message: errorMessage || 'Failed to sign in. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-main" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {/* Header with back and help buttons */}
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-4 px-6 py-6"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            <View className="flex-row items-center justify-between">
              <RouterBackButton />
              <NeedHelp />
            </View>

            <TextCustom type="title" size="4xl" className="text-center">
              Log in
            </TextCustom>

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

            <InputCustom
              key="password"
              placeholder="Your password"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry
              errorText={passwordError}
              leftIconName="lock"
            />

            <RippleButton
              fullWidth
              title="Continue"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              disabled={loading || email.length === 0 || password.length === 0}
            />

            <View className="self-center">
              <LinkCustom
                href="/auth/register"
                params={{ email }}
                text="Create account"
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

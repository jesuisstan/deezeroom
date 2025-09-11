import { FC, useState } from 'react';
import { View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import HelpModalButton from '@/components/auth/HelpModalButton';
import ButtonCustom from '@/components/ui/ButtonCustom';
import InputCustom from '@/components/ui/InputCustom';
import LinkCustom from '@/components/ui/LinkCustom';
import RouterBackButton from '@/components/ui/RouterBackButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { auth } from '@/utils/firebase-init';
import shootAlert from '@/utils/shoot-alert';

const LoginScreen: FC = () => {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState((params?.email || '').toString());
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { theme } = useTheme();

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
      const code = err?.code || '';
      console.log('Error code on login:', code); //debug
      if (code === 'auth/user-not-found') {
        shootAlert(
          'toast',
          'Account not found',
          'You can create a new account.',
          'warning'
        );
      } else if (code === 'auth/invalid-credential') {
        shootAlert(
          'toast',
          'Invalid credentials',
          'Please check entered email and password.',
          'warning'
        );
      } else if (code === 'auth/too-many-requests') {
        shootAlert(
          'toast',
          'Too many attempts',
          'Please try again later.',
          'warning'
        );
      } else {
        shootAlert(
          'toast',
          'Sign in error',
          'Failed to sign in. Please try again.',
          'error'
        );
      }
    } finally {
      setLoading(false);
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
        {/* Header with back and help buttons */}
        <View className="flex-row items-center justify-between">
          <RouterBackButton />
          <HelpModalButton />
        </View>

        <TextCustom type="title" size="4xl" className="text-center">
          Log in
        </TextCustom>

        <InputCustom
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
          placeholder="Your password"
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          errorText={passwordError}
          leftIconName="lock"
        />

        <ButtonCustom
          title="Continue"
          size="lg"
          loading={loading}
          onPress={handleSubmit}
          fullWidth
          disabled={loading || email.length === 0 || password.length === 0}
        />

        <View className="self-center">
          <LinkCustom
            href="/auth/register"
            params={{ email }}
            text="Create account"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;

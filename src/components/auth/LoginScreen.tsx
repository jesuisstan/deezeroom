import { FC, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';
import { auth } from '@/utils/firebase-init';
import shootAlert from '@/utils/shoot-alert';
import LinkCustom from '@/components/ui/LinkCustom';

const LoginScreen: FC = () => {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState((params?.email || '').toString());
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const router = useRouter();
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

  const handleBackPress = () => {
    router.back();
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
      if (code === 'auth/user-not-found') {
        shootAlert(
          'toast',
          'Account not found',
          'You can create a new account.',
          'warning'
        );
      } else if (code === 'auth/wrong-password') {
        setPasswordError('Incorrect email or password');
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
      <View className="flex-1 gap-4 px-6 py-6">
        {/* Header with back button */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleBackPress}
            className="items-center justify-center rounded-full bg-transparent"
          >
            <MaterialIcons
              name="chevron-left"
              size={42}
              color={themeColors[theme]['text-main']}
            />
          </TouchableOpacity>
          <FontAwesome6
            name="circle-question"
            size={24}
            color={themeColors[theme]['text-main']}
          />
        </View>

        <TextCustom
          type="title"
          className="text-center text-3xl font-bold leading-10 tracking-widest text-text-main"
        >
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

        <Button
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

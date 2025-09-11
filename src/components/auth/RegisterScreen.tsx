import { FC, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

import HelpModalButton from '@/components/auth/HelpModalButton';
import PasswordRequirements from '@/components/auth/PasswordRequirements';
import ButtonCustom from '@/components/ui/ButtonCustom';
import InputCustom from '@/components/ui/InputCustom';
import LinkCustom from '@/components/ui/LinkCustom';
import RouterBackButton from '@/components/ui/RouterBackButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { getFirebaseErrorMessage } from '@/utils/firebase-error-handler';
import { auth } from '@/utils/firebase-init';
import { UserService } from '@/utils/firebase-services';
import shootAlert from '@/utils/shoot-alert';

const RegisterScreen: FC = () => {
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = useMemo(
    () => (params?.email || '').toString(),
    [params]
  );
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const validateEmail = (val: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(val);
  const isConfirmValid = confirm.length > 0 && confirm === password;

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  // Update confirm error when password changes
  useEffect(() => {
    if (confirm.length > 0) {
      setConfirmError(confirm === password ? '' : 'Passwords do not match');
    }
  }, [password, confirm]);

  const handleSubmit = async () => {
    if (!validateEmail(email)) {
      setEmailError('The format of your email address is not valid');
      return;
    }
    if (!isPasswordValid || passwordError) return;
    if (!isConfirmValid) {
      setConfirmError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      await UserService.createOrUpdateUser(credential.user, {
        musicPreferences: { favoriteGenres: [], favoriteArtists: [] }
      });
      // Send verification email (AuthGuard will navigate to verify screen)
      try {
        await sendEmailVerification(credential.user);
        console.log('Verification email sent to user: ', credential.user.email);
      } catch (e) {
        console.log('sendEmailVerification error (non-critical):', e);
      }
    } catch (err: any) {
      const errorMessage = getFirebaseErrorMessage(err);
      console.log('Error on register:', errorMessage);
      shootAlert(
        'toast',
        'Registration error',
        errorMessage || 'Failed to create account. Please try again.',
        'error'
      );
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <View className="flex-1 gap-4 px-6 py-6">
            {/* Header with back and help buttons */}
            <View className="flex-row items-center justify-between">
              <RouterBackButton />
              <HelpModalButton />
            </View>

            <TextCustom type="title" size="4xl" className="text-center">
              Create account
            </TextCustom>

            {/* Email */}
            <InputCustom
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              onClear={() => {
                setEmail('');
                setEmailError('');
              }}
              leftIconName="mail"
              errorText={emailError}
            />

            {/* Password */}
            <InputCustom
              placeholder="Your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                const invalid = text.match(
                  /[^A-Za-z0-9!@\$%\^\*\(\)_\+\-\=\[\]\{\}:;\.,]/
                );
                setPasswordError(
                  invalid ? `Unsupported character: ${invalid[0]}` : ''
                );
              }}
              onClear={() => setPassword('')}
              secureTextEntry
              leftIconName="lock"
              errorText={passwordError}
            />

            {/* Repeat password */}
            <InputCustom
              placeholder="Repeat password"
              value={confirm}
              onChangeText={(text) => {
                setConfirm(text);
                setConfirmError(
                  text.length === 0 || text === password
                    ? ''
                    : 'Passwords do not match'
                );
              }}
              onClear={() => {
                setConfirm('');
                setConfirmError('');
              }}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              leftIconName="lock"
              onBlur={() => {
                if (confirm.length > 0 && confirm !== password) {
                  setConfirmError('Passwords do not match');
                }
              }}
              errorText={confirmError}
            />

            {/* Password requirements */}
            <PasswordRequirements
              password={password}
              onValidationChange={setIsPasswordValid}
            />

            {/* Submit Button */}
            <ButtonCustom
              title="Create account"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              fullWidth
              disabled={
                loading || !isPasswordValid || !isConfirmValid || !email
              }
            />
            <View className="self-center">
              <LinkCustom
                href="/auth/login"
                params={{ email }}
                text="Already have an account? Login"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;

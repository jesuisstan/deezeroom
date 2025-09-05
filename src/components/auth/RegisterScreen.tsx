import { FC, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';

import { FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/utils/firebase-init';
import { UserService } from '@/utils/firebase-services';
import shootAlert from '@/utils/shoot-alert';
import LinkCustom from '../ui/LinkCustom';

const RegisterScreen: FC = () => {
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = useMemo(
    () => (params?.email || '').toString(),
    [params]
  );
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  const validateEmail = (val: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(val);
  const passwordHasMinLength = password.length >= 8;
  const passwordHasLetter = /[A-Za-z]/.test(password);
  const passwordHasUppercase = /[A-Z]/.test(password);
  const passwordHasNumber = /\d/.test(password);
  // Allowed special characters (safe for routing contexts): ! @ $ % ^ * ( ) _ + - = [ ] { } : ; , .
  const passwordHasAllowedSpecial = /[!@\$%\^\*\(\)_\+\-\=\[\]\{\}:;\.,]/.test(
    password
  );
  const passwordHasLetterAndUppercase =
    passwordHasLetter && passwordHasUppercase;
  const isPasswordValid =
    passwordHasMinLength &&
    passwordHasLetterAndUppercase &&
    passwordHasNumber &&
    passwordHasAllowedSpecial;
  const isConfirmValid = confirm.length > 0 && confirm === password;

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  const handleSubmit = async () => {
    if (!validateEmail(email)) return;
    if (!isPasswordValid) return;
    if (!isConfirmValid) return;

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
      // AuthGuard will redirect to /(tabs)
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        shootAlert(
          'toast',
          'Email already in use',
          'Try logging in instead.',
          'warning'
        );
      } else if (code === 'auth/weak-password') {
        shootAlert(
          'toast',
          'Weak password',
          'Please meet the password requirements.',
          'warning'
        );
      } else if (code === 'auth/invalid-email') {
        shootAlert(
          'toast',
          'Invalid email',
          'Please check your email.',
          'error'
        );
      } else if (code === 'auth/operation-not-allowed') {
        shootAlert(
          'toast',
          'Registration disabled',
          'Email/password sign-up is not enabled.',
          'error'
        );
      } else {
        shootAlert(
          'toast',
          'Registration error',
          'Failed to create account. Please try again.',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    router.back();
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
              Create account
            </TextCustom>

            {/* Email */}
            <InputCustom
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onClear={() => setEmail('')}
              leftIconName="mail"
            />

            {/* Password */}
            <InputCustom
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              onClear={() => setPassword('')}
              secureTextEntry
              leftIconName="lock"
            />

            {/* Repeat password */}
            <InputCustom
              placeholder="Repeat password"
              value={confirm}
              onChangeText={setConfirm}
              onClear={() => setConfirm('')}
              secureTextEntry
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={handleSubmit}
              leftIconName="lock"
            />

            {/* Password requirements */}
            <View className="gap-4 rounded-xl bg-bg-secondary p-4">
              <TextCustom type="bold">Your password must include</TextCustom>
              <View className="gap-4">
                <View className="flex-row items-center gap-3">
                  <MaterialIcons
                    name={
                      passwordHasMinLength
                        ? 'check-circle'
                        : 'radio-button-unchecked'
                    }
                    size={20}
                    color={
                      themeColors[theme][
                        passwordHasMinLength
                          ? 'intent-success'
                          : 'text-disabled'
                      ]
                    }
                  />
                  <TextCustom>At least 8 characters</TextCustom>
                </View>
                <View className="flex-row items-center gap-3">
                  <MaterialIcons
                    name={
                      passwordHasLetterAndUppercase
                        ? 'check-circle'
                        : 'radio-button-unchecked'
                    }
                    size={20}
                    color={
                      themeColors[theme][
                        passwordHasLetterAndUppercase
                          ? 'intent-success'
                          : 'text-disabled'
                      ]
                    }
                  />
                  <TextCustom>
                    At least 1 letter (including 1 uppercase)
                  </TextCustom>
                </View>
                <View className="flex-row items-center gap-3">
                  <MaterialIcons
                    name={
                      passwordHasNumber
                        ? 'check-circle'
                        : 'radio-button-unchecked'
                    }
                    size={20}
                    color={
                      themeColors[theme][
                        passwordHasNumber ? 'intent-success' : 'text-disabled'
                      ]
                    }
                  />
                  <TextCustom>At least 1 number</TextCustom>
                </View>
                <View className="flex-row items-center gap-3">
                  <MaterialIcons
                    name={
                      passwordHasAllowedSpecial
                        ? 'check-circle'
                        : 'radio-button-unchecked'
                    }
                    size={20}
                    color={
                      themeColors[theme][
                        passwordHasAllowedSpecial
                          ? 'intent-success'
                          : 'text-disabled'
                      ]
                    }
                  />
                  <TextCustom>
                    At least 1 special character (not allowed: # & ? / \ &lt;
                    &gt; " ' ` | ~)
                  </TextCustom>
                </View>
                <View className="flex-row items-center gap-3">
                  <MaterialIcons
                    name={
                      isConfirmValid ? 'check-circle' : 'radio-button-unchecked'
                    }
                    size={20}
                    color={
                      themeColors[theme][
                        isConfirmValid ? 'intent-success' : 'text-disabled'
                      ]
                    }
                  />
                  <TextCustom>Passwords must match</TextCustom>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <Button
              title="Create account"
              size="lg"
              loading={loading}
              onPress={handleSubmit}
              fullWidth
              disabled={
                loading ||
                !validateEmail(email) ||
                !isPasswordValid ||
                !isConfirmValid
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

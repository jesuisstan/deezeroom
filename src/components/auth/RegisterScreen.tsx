import { FC, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

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
  const passwordHasNumber = /\d/.test(password);
  const isPasswordValid =
    passwordHasMinLength && passwordHasLetter && passwordHasNumber;
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
    // TODO: registration integration
    setTimeout(() => setLoading(false), 800);
  };

  const handleBackPress = () => {
    router.back();
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
          Create account
        </TextCustom>

        <Input
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          leftIconName="mail"
        />
        <Input
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
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
                    passwordHasMinLength ? 'intent-success' : 'text-disabled'
                  ]
                }
              />
              <TextCustom className="opacity-80">
                At least 8 characters
              </TextCustom>
            </View>
            <View className="flex-row items-center gap-3">
              <MaterialIcons
                name={
                  passwordHasLetter ? 'check-circle' : 'radio-button-unchecked'
                }
                size={20}
                color={
                  themeColors[theme][
                    passwordHasLetter ? 'intent-success' : 'text-disabled'
                  ]
                }
              />
              <TextCustom className="opacity-80">
                At least one letter
              </TextCustom>
            </View>
            <View className="flex-row items-center gap-3">
              <MaterialIcons
                name={
                  passwordHasNumber ? 'check-circle' : 'radio-button-unchecked'
                }
                size={20}
                color={
                  themeColors[theme][
                    passwordHasNumber ? 'intent-success' : 'text-disabled'
                  ]
                }
              />
              <TextCustom className="opacity-80">
                At least one number
              </TextCustom>
            </View>
          </View>
        </View>
        <Input
          label="Confirm password"
          placeholder="Repeat password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          leftIconName="lock"
        />
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
      </View>
    </SafeAreaView>
  );
};

export default RegisterScreen;

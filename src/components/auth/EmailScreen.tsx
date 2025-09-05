import { FC, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

const EmailScreen: FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const router = useRouter();
  const { theme } = useTheme();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Clear error when text changes
    if (emailError) {
      setEmailError('');
    }
  };

  const handleSubmit = async () => {
    // Final validation before submission
    if (!validateEmail(email)) {
      setEmailError('The format of your email address is not valid');
      return;
    }

    setLoading(true);
    // TODO: email/password auth integration
    router.push('/auth/password'); // TODO
    setTimeout(() => setLoading(false), 800);
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <SafeAreaView className="bg-bg-main flex-1" edges={['top', 'bottom']}>
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
          className="text-text-main text-center text-3xl font-bold leading-10 tracking-widest"
        >
          Email
        </TextCustom>

        <Input
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
        />

        <Button
          title="Continue"
          size="lg"
          loading={loading}
          onPress={handleSubmit}
          fullWidth
          disabled={loading || email.length === 0}
        />
      </View>
    </SafeAreaView>
  );
};

export default EmailScreen;

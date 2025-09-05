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

const PasswordScreen: FC = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();
  const { theme } = useTheme();

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    // Clear error when text changes
    if (passwordError) {
      setPasswordError('');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    // TODO: email/password auth integration
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
          Your password
        </TextCustom>

        <Input
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          title="Continue"
          size="lg"
          loading={loading}
          onPress={handleSubmit}
          fullWidth
          disabled={loading || password.length === 0}
        />
      </View>
    </SafeAreaView>
  );
};

export default PasswordScreen;

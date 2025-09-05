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
  const [test, setTest] = useState(''); // debug
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

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
          Email
        </TextCustom>

        <Input
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onClear={() => setEmail('')}
          showClearButton={true}
          autoFocus={true}
        />

        <Input
          placeholder="test"
          autoCapitalize="none"
          value={test}
          onChangeText={setTest}
          onClear={() => setTest('')}
          showClearButton={true}
          variant="outline"
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

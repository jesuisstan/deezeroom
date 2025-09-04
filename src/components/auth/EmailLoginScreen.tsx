import { FC, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import Input from '@/components/ui/Input';
import { TextCustom } from '@/components/ui/TextCustom';

const EmailLoginScreen: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    // TODO: email/password auth integration
    setTimeout(() => setLoading(false), 800);
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 gap-4 px-6 py-6">
        {/* Header with back button */}
        <View className="mb-4 flex-row items-center gap-4">
          <TouchableOpacity
            onPress={handleBackPress}
            className="bg-backgroundSecondary h-10 w-10 items-center justify-center rounded-full"
          >
            <IconSymbol size={20} name="chevron.left" color="#ffffff" />
          </TouchableOpacity>
          <TextCustom type="title">Sign in</TextCustom>
        </View>
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
        <Button
          title="Continue"
          loading={loading}
          onPress={handleSubmit}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
};

export default EmailLoginScreen;

import { FC, useState } from 'react';
import { View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TextCustom } from '@/components/ui/TextCustom';

const EmailLoginScreen: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // TODO: email/password auth integration
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 py-6 gap-4">
        <TextCustom type="title">Sign in</TextCustom>
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

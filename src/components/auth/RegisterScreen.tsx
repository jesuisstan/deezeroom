import { FC, useState } from 'react';
import { View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { TextCustom } from '@/components/ui/TextCustom';

const RegisterScreen: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // TODO: registration integration
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <SafeAreaView className="bg-bg-main flex-1" edges={['top', 'bottom']}>
      <View className="flex-1 gap-4 px-6 py-6">
        <TextCustom type="title">Create account</TextCustom>
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
          loading={loading}
          onPress={handleSubmit}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
};

export default RegisterScreen;

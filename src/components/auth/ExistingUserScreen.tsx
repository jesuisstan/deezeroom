import { FC } from 'react';
import { View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import { TextCustom } from '@/components/ui/TextCustom';

const ExistingUserScreen: FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 py-6 gap-4">
        <TextCustom type="title">Welcome back</TextCustom>
        <TextCustom className="opacity-70">
          It looks like you already have an account. Continue with Google or use
          email.
        </TextCustom>
        <Button title="Continue with Google" variant="secondary" fullWidth />
      </View>
    </SafeAreaView>
  );
};

export default ExistingUserScreen;

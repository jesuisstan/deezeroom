import { FC } from 'react';
import { View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { TextCustom } from '@/components/ui/TextCustom';

const HelpScreen: FC = () => {
  return (
    <SafeAreaView className="bg-bg-main flex-1" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-6">
        <TextCustom type="title">Need help?</TextCustom>
        <TextCustom className="mt-2 text-center opacity-70">
          This is a placeholder for the support screen. Content will be added
          later.
        </TextCustom>
      </View>
    </SafeAreaView>
  );
};

export default HelpScreen;

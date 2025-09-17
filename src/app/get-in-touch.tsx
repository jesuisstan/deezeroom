import { FC, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import RippleButton from '@/components/ui/buttons/RippleButton';
import RouterBackButton from '@/components/ui/buttons/RouterBackButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useUser } from '@/providers/UserProvider';

const GetInTouchScreen: FC = () => {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bg-main" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-6 py-6"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Header with back and help buttons */}
        <View className="flex-row items-center justify-between">
          {/* Back button signs out user and returns to auth */}
          <RouterBackButton />
        </View>

        <TextCustom type="title" size="4xl" className="text-center">
          Get in touch
        </TextCustom>

        <TextCustom>
          We're here to help you. Please contact us if you have any questions.
        </TextCustom>

        <View className="gap-4">
          {/* TODO: Add form here */}
          <TextCustom>Form coming soon...</TextCustom>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default GetInTouchScreen;

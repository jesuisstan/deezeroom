import { useState } from 'react';
import { Dimensions, View } from 'react-native';

import { Entypo } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import AccountCompromisedSection from '@/components/auth/need-help/AccountCompromisedSection';
import IconButton from '@/components/ui/buttons/IconButton';
import LineButton from '@/components/ui/buttons/LineButton';
import Divider from '@/components/ui/Divider';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const NeedHelp = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const { width } = Dimensions.get('window');
  const translateX = useSharedValue(0);

  const slideToAccountCompromised = () => {
    translateX.value = withTiming(-width, { duration: 300 });
  };

  const slideBackToMain = () => {
    translateX.value = withTiming(0, { duration: 300 });
  };

  const resetModal = () => {
    translateX.value = 0;
  };

  const handleModalClose = () => {
    setModalVisible(false);
    resetModal();
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }]
    };
  });

  const MainContent = () => (
    <View className="flex-1 gap-4 px-4 pb-4">
      {/* Password issues */}
      <View className="gap-2">
        <TextCustom color={themeColors[theme]['text-secondary']}>
          Password issues
        </TextCustom>
        <View className="overflow-hidden rounded-xl bg-bg-secondary">
          <LineButton
            onPress={() => {
              setModalVisible(false);
              router.push('/auth/reset-password');
            }}
          >
            <View className="w-full flex-row items-center justify-between px-5 py-4">
              <TextCustom type="bold">Forgot password?</TextCustom>
              <Entypo
                name="chevron-thin-right"
                size={19}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          </LineButton>
          <Divider inset />
          <LineButton>
            <View className="w-full flex-row items-center justify-between px-5 py-4">
              <TextCustom type="bold">Change your password</TextCustom>
              <Entypo
                name="chevron-thin-right"
                size={19}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          </LineButton>
        </View>
      </View>

      {/* Email issues */}
      <View className="gap-2">
        <TextCustom color={themeColors[theme]['text-secondary']}>
          Email issues
        </TextCustom>
        <View className="overflow-hidden rounded-xl bg-bg-secondary">
          <LineButton>
            <View className="w-full flex-row items-center justify-between px-5 py-4">
              <TextCustom type="bold">Can't access email?</TextCustom>
              <Entypo
                name="chevron-thin-right"
                size={19}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          </LineButton>
          <Divider inset />
          <LineButton>
            <View className="w-full flex-row items-center justify-between px-5 py-4">
              <TextCustom type="bold">Incorrect email?</TextCustom>
              <Entypo
                name="chevron-thin-right"
                size={19}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          </LineButton>
          <Divider inset />

          {/* Account compromised */}
          <LineButton onPress={slideToAccountCompromised}>
            <View className="w-full flex-row items-center justify-between px-5 py-4">
              <TextCustom type="bold">Account compromised?</TextCustom>
              <Entypo
                name="chevron-thin-right"
                size={19}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          </LineButton>
        </View>
      </View>
    </View>
  );

  return (
    <View>
      {/* Help Modal Trigger Button */}
      <IconButton
        accessibilityLabel="Help"
        onPress={() => {
          if (!modalVisible) {
            setModalVisible(true);
          }
        }}
      >
        <FontAwesome6
          name="circle-question"
          size={24}
          color={themeColors[theme]['text-main']}
        />
      </IconButton>

      {/* Help Modal */}
      <SwipeModal
        title="Need help?"
        modalVisible={modalVisible}
        setVisible={handleModalClose}
        onClose={resetModal}
      >
        <View className="flex-1">
          {/* Animated content container */}
          <Animated.View
            style={[
              {
                flexDirection: 'row',
                width: width * 2,
                flex: 1
              },
              animatedStyle
            ]}
          >
            <MainContent />
            <AccountCompromisedSection onBackPress={slideBackToMain} />
          </Animated.View>
        </View>
      </SwipeModal>
    </View>
  );
};

export default NeedHelp;

import { useState } from 'react';
import { Dimensions, View } from 'react-native';

import { Entypo } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';
import Animated, {
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import AccountCompromisedSection from '@/components/auth/need-help/AccountCompromisedSection';
import CanNotAccessEmailSection from '@/components/auth/need-help/CanNotAccessEmailSection';
import IncorrectEmailSection from '@/components/auth/need-help/IncorrectEmailSection';
import IconButton from '@/components/ui/buttons/IconButton';
import LineButton from '@/components/ui/buttons/LineButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import Divider from '@/components/ui/Divider';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

type SecondaryContentType =
  | 'account-compromised'
  | 'cant-access-email'
  | 'incorrect-email'
  | null;

const NeedHelp = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [secondaryContentType, setSecondaryContentType] =
    useState<SecondaryContentType>(null);

  const { width } = Dimensions.get('window');
  const translateX = useSharedValue(0);
  const widthMutable = makeMutable(width);

  const slideToSecondary = (contentType: SecondaryContentType) => {
    setSecondaryContentType(contentType);
    translateX.value = withTiming(-widthMutable.value, { duration: 300 });
  };

  const slideBackToMain = () => {
    translateX.value = withTiming(0, { duration: 300 });
  };

  const resetModal = () => {
    translateX.value = 0;
    setSecondaryContentType(null);
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
    <View className="flex-1 gap-4 px-4 pb-4" style={{ width: '50%' }}>
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
              <TextCustom type="semibold" size="l">
                Forgot password?
              </TextCustom>
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
          QEmail issues
        </TextCustom>
        <View className="overflow-hidden rounded-xl bg-bg-secondary">
          <LineButton onPress={() => slideToSecondary('cant-access-email')}>
            <View className="w-full flex-row items-center justify-between px-5 py-4">
              <TextCustom type="semibold" size="l">
                Can't access email?
              </TextCustom>
              <Entypo
                name="chevron-thin-right"
                size={19}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          </LineButton>
          <Divider inset />
          <LineButton onPress={() => slideToSecondary('incorrect-email')}>
            <View className="w-full flex-row items-center justify-between px-5 py-4">
              <TextCustom type="semibold" size="l">
                Incorrect email?
              </TextCustom>
              <Entypo
                name="chevron-thin-right"
                size={19}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          </LineButton>
          <Divider inset />

          {/* Account compromised */}
          <LineButton onPress={() => slideToSecondary('account-compromised')}>
            <View className="w-full flex-row items-center justify-between px-5 py-4">
              <TextCustom type="semibold" size="l">
                Account compromised?
              </TextCustom>
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

  const SecondaryContent = () => {
    const renderContent = () => {
      switch (secondaryContentType) {
        case 'account-compromised':
          return <AccountCompromisedSection />;
        case 'cant-access-email':
          return <CanNotAccessEmailSection />;
        case 'incorrect-email':
          return <IncorrectEmailSection />;
        default:
          return null;
      }
    };

    return (
      <View className="flex-1 gap-4 px-4 pb-4" style={{ width: '50%' }}>
        <View>{renderContent()}</View>

        <View className="flex-1">
          {/* Back button */}
          <RippleButton
            title="Back to Help"
            size="md"
            variant="outline"
            width="full"
            onPress={slideBackToMain}
            leftIcon={
              <Entypo
                name="chevron-thin-left"
                size={19}
                color={themeColors[theme]['text-secondary']}
              />
            }
          />
        </View>
      </View>
    );
  };

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
        <View
          className="flex-1 overflow-hidden"
          onLayout={({ nativeEvent }) => {
            widthMutable.value = nativeEvent.layout.width;
          }}
        >
          {/* Animated content container */}
          <Animated.View
            style={[
              {
                flexDirection: 'row',
                width: '200%',
                flex: 1
              },
              animatedStyle
            ]}
          >
            <MainContent />
            <SecondaryContent />
          </Animated.View>
        </View>
      </SwipeModal>
    </View>
  );
};

export default NeedHelp;

import { ReactNode, useEffect, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import EvilIcons from '@expo/vector-icons/EvilIcons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface SwipeModalProps {
  modalVisible: boolean; // Whether the modal is visible
  setVisible: (visible: boolean) => void; // Function to set the visibility of the modal
  children: ReactNode; // Content of the modal passed as children
  onClose?: () => void; // Side effect function, should be used to reset state or perform other side effects
  duration?: number; // Duration of the animation
  disableSwipe?: boolean; // Disable the swipe gesture
  fade?: boolean; // Fade the background
  title?: string; // Title of the modal
}

const SwipeModal = (props: SwipeModalProps) => {
  const { theme } = useTheme();
  const { height } = Dimensions.get('window');
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(height);
  const [isAnimating, setIsAnimating] = useState(false);

  const closeModal = () => {
    setIsAnimating(true);
    translateY.value = withTiming(height, { duration: 250 });
    // Вызываем функции после анимации через setTimeout
    setTimeout(() => {
      setIsAnimating(false);
      props.setVisible(false);
      props.onClose?.();
    }, 250);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (isAnimating) return;
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (isAnimating) return;

      if (event.translationY > 100 && event.velocityY > 0) {
        closeModal();
      } else {
        translateY.value = withSpring(0);
      }
    });

  useEffect(() => {
    if (props.modalVisible) {
      translateY.value = height;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.modalVisible]);

  // Handle back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (props.modalVisible) {
          closeModal();
          return true; // Prevent default behavior
        }
        return false;
      }
    );

    return () => backHandler.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.modalVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }]
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    const opacity =
      translateY.value === 0 ? 1 : Math.max(0, 1 - translateY.value / height);
    return {
      opacity: props.fade ? opacity : 1,
      backgroundColor: `rgba(0, 0, 0, ${opacity * 0.5})`
    };
  });

  if (!props.modalVisible) return null;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={props.modalVisible}
      statusBarTranslucent // Android: lets the modal go under the status bar
      presentationStyle="overFullScreen" // iOS: lets the modal go under the status bar
      onShow={() => {
        setIsAnimating(true);
        translateY.value = withTiming(0, { duration: 250 });
        // Завершаем анимацию через setTimeout
        setTimeout(() => {
          setIsAnimating(false);
        }, 250);
      }}
      onRequestClose={closeModal}
    >
      <Animated.View
        id="modal-background"
        style={[
          {
            flex: 1,
            justifyContent: 'flex-end',
            paddingTop: insets.top
          },
          backgroundStyle
        ]}
      >
        <GestureDetector gesture={panGesture}>
          <Animated.View
            id="modal-content"
            style={[
              {
                flex: 1,
                backgroundColor: themeColors[theme]['bg-main'],
                borderTopLeftRadius: 25,
                borderTopRightRadius: 25,
                paddingTop: 16,
                paddingHorizontal: 20,
                paddingBottom: 16
              },
              animatedStyle
            ]}
          >
            {/* Close Button */}
            <View className="absolute right-5 top-2 z-[1000]">
              <EvilIcons
                name="close"
                size={42}
                color={themeColors[theme]['text-main']}
                onPress={closeModal}
              />
            </View>

            <TextCustom type="bold" size="l" className="mb-8 text-center">
              {props.title}
            </TextCustom>

            <ScrollView style={{ flex: 1 }}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={{ flex: 1, minHeight: '100%' }}>
                  {props.children}
                </View>
              </TouchableWithoutFeedback>
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
};

export default SwipeModal;

import { ReactNode, useEffect, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Modal,
  PanResponder,
  ScrollView,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import EvilIcons from '@expo/vector-icons/EvilIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ButtonIcon from '@/components/ui/ButtonIcon';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const DEFAULT_DURATION = 250;

interface SwipeModalProps {
  modalVisible: boolean; // Whether the modal is visible
  setVisible: (visible: boolean) => void; // Function to set the visibility of the modal
  children: ReactNode; // Content of the modal passed as children
  title?: string; // Title of the modal
  onClose?: () => void; // Side effect function, should be used to reset state or perform other side effects
  disableSwipe?: boolean; // Disable the swipe gesture
  fade?: boolean; // Fade the background
  duration?: number; // Duration of the animation
}

const SwipeModal = (props: SwipeModalProps) => {
  const { theme } = useTheme();
  const { height } = Dimensions.get('window');
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(height - insets.top);
  const [isAnimating, setIsAnimating] = useState(false);

  const closeModal = () => {
    setIsAnimating(true);
    translateY.value = withTiming(height - insets.top, {
      duration: props.duration || DEFAULT_DURATION
    });
    // Call functions after animation via setTimeout
    setTimeout(() => {
      setIsAnimating(false);
      props.setVisible(false);
      props.onClose?.();
    }, props.duration || DEFAULT_DURATION);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !props.disableSwipe && !isAnimating,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      if (props.disableSwipe || isAnimating) return false;
      // Activate only on vertical downward movement
      return (
        gestureState.dy > 0 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
      );
    },
    onPanResponderGrant: () => {
      // Optional: Add any logic when gesture begins
    },
    onPanResponderMove: (_, gestureState) => {
      if (isAnimating || props.disableSwipe) return;

      // Allow modal to follow finger in both directions
      // positive dy = swipe down, negative dy = swipe up
      translateY.value = Math.max(0, gestureState.dy);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (isAnimating || props.disableSwipe) return;

      // Close only if:
      // 1. User swiped down significantly (> 100px) AND is still moving down (positive velocity)
      // 2. OR user swiped down very fast (velocity > 0.5)
      const shouldClose =
        (gestureState.dy > 100 && gestureState.vy > 0) || // Significant down swipe with downward velocity
        gestureState.vy > 0.5; // Very fast downward swipe

      if (shouldClose) {
        closeModal();
      } else {
        // Return to original position if user changed their mind
        translateY.value = withSpring(0, {
          damping: 80, // High damping = less bouncing, faster settling
          stiffness: 400 // High stiffness = fast, snappy animation
        });
      }
    }
  });

  useEffect(() => {
    if (props.modalVisible) {
      translateY.value = height - insets.top;
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
    const modalHeight = height - insets.top;
    const opacity =
      translateY.value === 0
        ? 1
        : Math.max(0, 1 - translateY.value / modalHeight);
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
        translateY.value = withTiming(0, {
          duration: props.duration || DEFAULT_DURATION
        }); // No bouncing, linear animation
        // Complete animation via setTimeout
        setTimeout(() => {
          setIsAnimating(false);
        }, props.duration || DEFAULT_DURATION);
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
        {/* Background overlay - clickable to close */}
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        <Animated.View
          id="modal-content"
          style={[
            {
              backgroundColor: themeColors[theme]['bg-main'],
              borderTopLeftRadius: 25,
              borderTopRightRadius: 25,
              height: height - insets.top, // Screen height minus status bar
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: -2
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5
            },
            animatedStyle
          ]}
          {...panResponder.panHandlers}
        >
          {/* Drag handle */}
          <View
            style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: themeColors[theme]['border'],
                borderRadius: 2
              }}
            />
          </View>

          {/* Header with close button */}
          <View
            style={{
              paddingTop: 8,
              paddingHorizontal: 20,
              paddingBottom: 16,
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <View className="absolute -top-1 right-4 z-[1000]">
              <ButtonIcon accessibilityLabel="Close" onPress={closeModal}>
                <EvilIcons
                  name="close"
                  size={42}
                  color={themeColors[theme]['text-main']}
                />
              </ButtonIcon>
            </View>

            {props.title && (
              <TextCustom type="bold" size="xl" className="mb-4 text-center">
                {props.title}
              </TextCustom>
            )}
          </View>

          {/* Content area */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingBottom: 16
            }}
            showsVerticalScrollIndicator={false}
          >
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={{ flex: 1 }}>{props.children}</View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default SwipeModal;

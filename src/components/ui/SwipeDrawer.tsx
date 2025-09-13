import { ReactNode, useEffect, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Modal,
  PanResponder,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const DEFAULT_DURATION = 250;

interface SwipeDrawerProps {
  modalVisible: boolean; // Whether the drawer is visible
  setVisible: (visible: boolean) => void; // Function to set the visibility of the drawer
  children: ReactNode; // Content of the drawer passed as children
  title?: string; // Title of the drawer
  side?: 'left' | 'right'; // Which side the drawer slides from
  onClose?: () => void; // Side effect function, should be used to reset state or perform other side effects
  duration?: number; // Duration of the animation
  disableSwipe?: boolean; // Disable the swipe gesture
  fade?: boolean; // Fade the background
}

const SwipeDrawer = (props: SwipeDrawerProps) => {
  const { theme } = useTheme();
  const { width, height } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const side = props.side || 'right';

  const translateX = useSharedValue(side === 'right' ? width : -width);
  const [isAnimating, setIsAnimating] = useState(false);

  const closeDrawer = () => {
    setIsAnimating(true);
    translateX.value = withTiming(side === 'right' ? width : -width, {
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
      // Activate only on horizontal movement
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    onPanResponderGrant: () => {
      // Optional: Add any logic when gesture begins
    },
    onPanResponderMove: (_, gestureState) => {
      if (isAnimating || props.disableSwipe) return;

      if (side === 'right') {
        // For right drawer: positive dx means swipe right (close)
        translateX.value = Math.max(0, gestureState.dx);
      } else {
        // For left drawer: negative dx means swipe left (close)
        translateX.value = Math.min(0, gestureState.dx);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (isAnimating || props.disableSwipe) return;

      if (side === 'right') {
        // Close if swipe right > 100px or velocity > 0.5
        if (gestureState.dx > 100 || gestureState.vx > 0.5) {
          closeDrawer();
        } else {
          translateX.value = withTiming(0, {
            duration: props.duration || DEFAULT_DURATION
          }); // No bouncing, linear animation
        }
      } else {
        // Close if swipe left > 100px or velocity > 0.5
        if (gestureState.dx < -100 || gestureState.vx < -0.5) {
          closeDrawer();
        } else {
          translateX.value = withTiming(0, { duration: DEFAULT_DURATION }); // No bouncing, linear animation
        }
      }
    }
  });

  useEffect(() => {
    if (props.modalVisible) {
      translateX.value = side === 'right' ? width : -width;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.modalVisible]);

  // Handle back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (props.modalVisible) {
          closeDrawer();
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
      transform: [{ translateX: translateX.value }]
    };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    const opacity =
      translateX.value === 0
        ? 1
        : Math.max(0, 1 - Math.abs(translateX.value) / width);
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
        translateX.value = withTiming(0, {
          duration: props.duration || DEFAULT_DURATION
        });
        // Complete animation via setTimeout
        setTimeout(() => {
          setIsAnimating(false);
        }, props.duration || DEFAULT_DURATION);
      }}
      onRequestClose={closeDrawer}
    >
      <Animated.View
        id="drawer-background"
        style={[
          {
            flex: 1,
            flexDirection: 'row'
          },
          backgroundStyle
        ]}
      >
        {/* Background overlay - clickable to close */}
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        <Animated.View
          id="drawer-content"
          style={[
            {
              width: width * 0.85, // 85% of screen width
              height: height, // Full screen height
              backgroundColor: themeColors[theme]['bg-main'],
              shadowColor: '#000',
              shadowOffset: {
                width: side === 'right' ? -2 : 2,
                height: 0
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5
            },
            animatedStyle
          ]}
          {...panResponder.panHandlers}
        >
          {/* Header with close button */}
          <View
            style={{
              paddingTop: insets.top + 16, // Status bar height + padding
              paddingHorizontal: 20,
              paddingBottom: 16,
              position: 'relative'
            }}
          >
            {props.title && (
              <TextCustom type="bold" size="l" className="mb-8 text-center">
                {props.title}
              </TextCustom>
            )}
          </View>

          {/* Content area */}
          <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 16 }}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={{ flex: 1 }}>{props.children}</View>
            </TouchableWithoutFeedback>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default SwipeDrawer;

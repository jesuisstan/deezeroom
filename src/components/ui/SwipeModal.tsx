import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  ScrollView,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import EvilIcons from '@expo/vector-icons/EvilIcons';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

import { TextCustom } from './TextCustom';

interface SwipeModalProps {
  modalVisible: boolean;
  onClose?: () => void;
  content: ReactNode;
  duration?: number;
  disableSwipe?: boolean;
  fade?: boolean;
  title?: string;
}

const SwipeModal = (props: SwipeModalProps) => {
  const { theme } = useTheme();
  const { height } = Dimensions.get('window');

  const TIMING_CONFIG = {
    duration: props.duration ? props.duration : 250,
    easing: Easing.inOut(Easing.ease)
  };

  const pan = useRef(new Animated.ValueXY()).current;

  let [isAnimating, setIsAnimating] = useState(
    props.disableSwipe ? true : false
  );

  const closeModal = () => {
    setIsAnimating(true);
    Animated.timing(pan, {
      toValue: { x: 0, y: height },
      ...TIMING_CONFIG,
      useNativeDriver: false
    }).start(() => {
      setIsAnimating(false);
      // Close modal only after animation is complete
      setTimeout(() => {
        props.onClose?.();
      }, 100);
    });
  };

  const animatedValueX = useRef(0);
  const animatedValueY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isAnimating) {
          return false;
        }
        if (gestureState.dy > 22) {
          return true;
        }
        return false;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: animatedValueX.current,
          y: animatedValueY.current
        });
        pan.setValue({ x: 0, y: 0 }); // Initial value
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          pan.setValue({ x: 0, y: gestureState.dy });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // The user has released all touches while this view is the
        // responder. This typically means a gesture has succeeded
        // Flatten the offset so it resets the default positioning
        if (gestureState.dy > 0 && gestureState.vy > 0) {
          if (gestureState.vy <= -0.7 || gestureState.dy <= -100) {
            setIsAnimating(true);
            Animated.timing(pan, {
              toValue: { x: 0, y: -height },
              ...TIMING_CONFIG,
              useNativeDriver: false
            }).start(() => {
              setIsAnimating(false);
              // Close modal only after animation is complete
              setTimeout(() => {
                props.onClose?.();
              }, 100);
            });
          } else if (gestureState.vy >= 0.5 || gestureState.dy >= 100) {
            closeModal();
          } else {
            setIsAnimating(true);
            Animated.spring(pan, {
              toValue: 0,
              useNativeDriver: false
            }).start(() => {
              setIsAnimating(false);
              // props.onClose();
            });
          }
        } else {
          setIsAnimating(true);
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false
          }).start(() => {
            setIsAnimating(false);
            // props.onClose();
          });
        }
      }
    })
  ).current;

  useEffect(() => {
    if (props.modalVisible) {
      animatedValueX.current = 0;
      animatedValueY.current = 0;
      pan.setOffset({
        x: animatedValueX.current,
        y: animatedValueY.current
      });
      pan.setValue({
        x: 0,
        y: height
      }); // Initial value
      pan.x.addListener((value) => (animatedValueX.current = value.value));
      pan.y.addListener((value) => (animatedValueY.current = value.value));
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

  let handleGetStyleBody = (opacity: any) => {
    return [
      {
        flex: 1,
        backgroundColor: themeColors[theme]['bg-main'],
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 40
      },
      {
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
        opacity: opacity
      }
    ];
  };

  let interpolateBackgroundOpacity = pan.y.interpolate({
    inputRange: [-height, 0, height],
    outputRange: [props.fade ? 0 : 1, 1, props.fade ? 0 : 1]
  });

  let interpolateBackgroundColor = pan.y.interpolate({
    inputRange: [-height, 0, height],
    outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0)']
  });

  if (!props.modalVisible) return null;

  return (
    <>
      {/*<StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor={`rgba(0, 0, 0, 0.5)`}
        hidden={false}
      />*/}
      <Modal
        animationType="none"
        transparent={true}
        visible={props.modalVisible}
        onShow={() => {
          setIsAnimating(true);
          Animated.timing(pan, {
            ...TIMING_CONFIG,
            toValue: { x: 0, y: 0 },
            useNativeDriver: false
          }).start(() => {
            setIsAnimating(false);
          });
        }}
        onRequestClose={closeModal}
      >
        <Animated.View
          id="modal-background"
          style={{
            backgroundColor: interpolateBackgroundColor,
            flex: 1,
            justifyContent: 'flex-end',
            opacity: interpolateBackgroundOpacity
          }}
        >
          <Animated.View
            id="modal-content"
            style={handleGetStyleBody(interpolateBackgroundOpacity)}
            {...panResponder.panHandlers}
          >
            {/* Close Button */}
            <View className="absolute right-5 top-2 z-[1000]">
              <EvilIcons
                name="close"
                size={42}
                color={themeColors[theme]['text-main']}
                onPress={() => {
                  console.log('closeModal');
                  closeModal();
                }}
              />
            </View>

            <TextCustom type="bold" size="l" className="mb-8 text-center">
              {props.title}
            </TextCustom>

            <ScrollView style={{ flex: 1 }}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={{ flex: 1 }}>{props.content}</View>
              </TouchableWithoutFeedback>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
};

export default SwipeModal;

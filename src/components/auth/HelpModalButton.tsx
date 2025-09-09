import { useState, useCallback } from 'react';
import { Modal, Pressable, View, StatusBar, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import ButtonIcon from '@/components/ui/ButtonIcon';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';
import Divider from '@/components/ui/Divider';

const HelpModalButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useTheme();

  // Animation values
  const translateY = useSharedValue(0);
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.2; // 20% of screen height

  const closeModal = useCallback(() => {
    setModalVisible(false);
    // Reset position when modal is closed
    translateY.value = 0;
  }, [translateY]);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      // Optional: Add any logic when gesture begins
    })
    .onUpdate((event) => {
      // Only allow downward dragging (positive Y values)
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > 500) {
        // If dragged past threshold or flicked down quickly, close the modal
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
          runOnJS(closeModal)();
        });
      } else {
        // Otherwise, snap back to original position
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  // Animated styles for the modal content
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }]
    };
  });

  return (
    <View>
      {/* Default status bar style when modal is not visible */}
      {!modalVisible && (
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent={true}
        />
      )}
      {/* Help Modal Trigger Button */}
      <ButtonIcon
        accessibilityLabel="Help"
        onPress={() => setModalVisible(true)}
      >
        <FontAwesome6
          name="circle-question"
          size={24}
          color={themeColors[theme]['text-main']}
        />
      </ButtonIcon>

      {/* Help Modal */}
      {modalVisible && (
        <Modal
          animationType="none" // We'll handle animation ourselves with Reanimated
          transparent={true}
          visible={true}
          onRequestClose={() => setModalVisible(false)}
          presentationStyle="fullScreen"
        >
          {/* Status bar styling when modal is visible */}
          <StatusBar
            barStyle="light-content"
            backgroundColor="rgba(0,0,0,0.5)"
            translucent={true}
          />

          {/* Content wrapped in GestureHandlerRootView */}
          {/* Dimming overlay */}
          <View
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          />

          {/* Modal content with gesture detection */}
          <GestureDetector gesture={gesture}>
            <Animated.View
              className="flex-1 gap-4 rounded-t-[35px] border border-border px-6 py-6"
              style={[
                {
                  backgroundColor: themeColors[theme]['bg-main'],
                  shadowColor: themeColors[theme]['bg-inverse']
                },
                animatedStyle
              ]}
            >
              {/* Close Icon */}
              <View className="absolute right-4 top-4 p-1.5">
                <ButtonIcon
                  accessibilityLabel="Close"
                  onPress={() => setModalVisible(false)}
                >
                  <MaterialIcons
                    name="close"
                    size={35}
                    color={themeColors[theme]['text-main']}
                  />
                </ButtonIcon>
              </View>

              {/* Title */}
              <TextCustom type="bold" size="l" className="mb-4 text-center">
                Need help?
              </TextCustom>

              {/* Password issues */}
              {/* TODO СОДЕРЖАТЕЛЬНО ГРУППА Password issues ГОТОВАЮ НУ УДАЛЯТЬ, НЕ ДОБАВЛЯТЬ НОВЫХ */}
              <View className="flex-1 gap-4">
                <View className="gap-2">
                  <TextCustom color={themeColors[theme]['text-secondary']}>
                    Password issues
                  </TextCustom>
                  <View className="overflow-hidden rounded-2xl bg-bg-secondary">
                    <Pressable className="flex-row items-center justify-between px-5 py-5">
                      <TextCustom type="bold" size="l">
                        Forgot password?
                      </TextCustom>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={themeColors[theme]['text-secondary']}
                      />
                    </Pressable>
                    <Divider inset />
                    <Pressable className="flex-row items-center justify-between px-5 py-5">
                      <TextCustom type="bold" size="l">
                        Change your password
                      </TextCustom>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={themeColors[theme]['text-secondary']}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Email issues */}
                <View className="gap-2">
                  <TextCustom color={themeColors[theme]['text-secondary']}>
                    Email issues
                  </TextCustom>
                  <View className="overflow-hidden rounded-2xl bg-bg-secondary">
                    <Pressable className="flex-row items-center justify-between px-5 py-5">
                      <TextCustom type="bold" size="l">
                        Can't access email?
                      </TextCustom>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={themeColors[theme]['text-secondary']}
                      />
                    </Pressable>
                    <Divider inset />
                    <Pressable className="flex-row items-center justify-between px-5 py-5">
                      <TextCustom type="bold" size="l">
                        Incorrect email?
                      </TextCustom>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={themeColors[theme]['text-secondary']}
                      />
                    </Pressable>
                    <Divider inset />
                    <Pressable className="flex-row items-center justify-between px-5 py-5">
                      <TextCustom type="bold" size="l">
                        Account compromised?
                      </TextCustom>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={themeColors[theme]['text-secondary']}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        </Modal>
      )}
    </View>
  );
};

export default HelpModalButton;

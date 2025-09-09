import { useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, View } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

import ButtonIcon from '@/components/ui/ButtonIcon';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';
import Divider from '@/components/ui/Divider';

const HelpModalButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useTheme();

  // to allow closing the modal by dragging down (USAGE: add {...panResponder.panHandlers} to the parent View)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 12,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 && gesture.vy > 0.3) {
          setModalVisible(false);
        }
      }
    })
  ).current;

  return (
    <View {...panResponder.panHandlers}>
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
      <Modal
        animationType="slide"
        transparent={true} // important for rounded corners
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
        presentationStyle="fullScreen"
      >
        <View
          className="flex-1 gap-4 rounded-t-[35px] border border-border px-6 py-6"
          style={{
            backgroundColor: themeColors[theme]['bg-main'],
            shadowColor: themeColors[theme]['bg-inverse']
          }}
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
        </View>
      </Modal>
    </View>
  );
};

export default HelpModalButton;

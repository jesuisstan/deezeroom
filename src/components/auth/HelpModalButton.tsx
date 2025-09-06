import { useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

const HelpModalButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useTheme();
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
    <>
      {/* Help Modal Trigger Button */}
      <View className="h-12 w-12 overflow-hidden rounded-full bg-bg-main">
        <Pressable
          onPress={() => {
            setModalVisible(true);
          }}
          className="flex-1 items-center justify-center"
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Help"
          android_ripple={{
            color: themeColors[theme]['border'],
            borderless: false
          }}
        >
          <FontAwesome6
            name="circle-question"
            size={24}
            color={themeColors[theme]['text-main']}
          />
        </Pressable>
      </View>

      {/* Help Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView} {...panResponder.panHandlers}>
          <View
            style={[
              styles.modalView,
              { backgroundColor: themeColors[theme]['bg-main'] }
            ]}
          >
            {/* Close Icon */}
            <Pressable
              onPress={() => setModalVisible(false)}
              style={styles.closeIcon}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialIcons
                name="close"
                size={42}
                color={themeColors[theme]['text-main']}
              />
            </Pressable>

            {/* Title */}
            <TextCustom type="bold">Need help?</TextCustom>

            {/* Password issues */}
            <View className="mt-6 px-4">
              <TextCustom>Password issues</TextCustom>
              <View className="overflow-hidden rounded-2xl bg-bg-secondary">
                <Pressable className="flex-row items-center justify-between px-6 py-5">
                  <TextCustom className="text-lg font-semibold text-text-main">
                    No login email received?
                  </TextCustom>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={themeColors[theme]['text-secondary']}
                  />
                </Pressable>
                <View className="mx-4 h-px bg-border" />
                <Pressable className="flex-row items-center justify-between px-6 py-5">
                  <TextCustom className="text-lg font-semibold text-text-main">
                    Link not working?
                  </TextCustom>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={themeColors[theme]['text-secondary']}
                  />
                </Pressable>
              </View>

              {/* Email issues */}
              <TextCustom>Email issues</TextCustom>
              <View className="overflow-hidden rounded-2xl bg-bg-secondary">
                <Pressable className="flex-row items-center justify-between px-6 py-5">
                  <TextCustom className="text-lg font-semibold text-text-main">
                    Can't access email?
                  </TextCustom>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={themeColors[theme]['text-secondary']}
                  />
                </Pressable>
                <View className="mx-4 h-px bg-border" />
                <Pressable className="flex-row items-center justify-between px-6 py-5">
                  <TextCustom className="text-lg font-semibold text-text-main">
                    Incorrect email?
                  </TextCustom>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={themeColors[theme]['text-secondary']}
                  />
                </Pressable>
                <View className="mx-4 h-px bg-border" />
                <Pressable className="flex-row items-center justify-between px-6 py-5">
                  <TextCustom className="text-lg font-semibold text-text-main">
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
    </>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 15,
    width: '100%',
    height: '100%'
  },
  closeIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center'
  }
});

export default HelpModalButton;

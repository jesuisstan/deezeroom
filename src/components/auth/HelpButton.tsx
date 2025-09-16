import { useState } from 'react';
import { View } from 'react-native';

import { Entypo } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';

import IconButton from '@/components/ui/buttons/IconButton';
import LineButton from '@/components/ui/buttons/LineButton';
import Divider from '@/components/ui/Divider';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const HelpButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useTheme();
  const router = useRouter();

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
        setVisible={setModalVisible}
      >
        <View className="flex-1 gap-4">
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
              <LineButton>
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
      </SwipeModal>
    </View>
  );
};

export default HelpButton;

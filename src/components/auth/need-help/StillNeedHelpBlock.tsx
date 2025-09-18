import { View } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';
import * as MailComposer from 'expo-mail-composer';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const StillNeedHelpBlock = () => {
  const { theme } = useTheme();

  const handleEmailPress = async () => {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();

      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: ['support@deezeroom.com'],
          subject: 'Need Help - Deezeroom Support',
          body: 'Hello,\n\nI need help with my Deezeroom account.\n\nPlease describe your issue:\n\n\n\nBest regards,'
        });
      } else {
        // Fallback: open mail app via Linking
        console.log('Mail composer not available');
      }
    } catch (error) {
      console.error('Error opening mail composer:', error);
    }
  };

  return (
    <View className="flex-row items-start gap-4">
      <AntDesign
        name="message"
        size={23}
        color={themeColors[theme]['text-secondary']}
      />
      <View>
        <TextCustom type="bold" size="l">
          Still need help?
        </TextCustom>
        <TextCustom type="link" onPress={handleEmailPress}>
          Get in touch
        </TextCustom>
      </View>
    </View>
  );
};

export default StillNeedHelpBlock;

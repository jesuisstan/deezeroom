import { Pressable, View } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';

import { TextCustom } from '@/components/ui/TextCustom';
import useContactSupport from '@/hooks/useContactSupport';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const StillNeedHelpBlock = () => {
  const { theme } = useTheme();
  const { handleContactSupport } = useContactSupport();

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
        <Pressable onPress={handleContactSupport}>
          <TextCustom type="link">Get in touch</TextCustom>
        </Pressable>
      </View>
    </View>
  );
};

export default StillNeedHelpBlock;

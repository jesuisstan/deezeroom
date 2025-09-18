import { View } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';

import LinkCustom from '@/components/ui/buttons/LinkCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const StillNeedHelpBlock = () => {
  const { theme } = useTheme();

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
        <LinkCustom href="/get-in-touch" text="Get in touch" />
      </View>
    </View>
  );
};

export default StillNeedHelpBlock;

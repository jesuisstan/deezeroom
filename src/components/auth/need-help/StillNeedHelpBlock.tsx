import { View } from 'react-native';

import EvilIcons from '@expo/vector-icons/EvilIcons';

import LinkCustom from '@/components/ui/buttons/LinkCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const StillNeedHelpBlock = () => {
  const { theme } = useTheme();

  return (
    <View className="flex-row items-start gap-2">
      <EvilIcons
        name="exclamation"
        size={30}
        color={themeColors[theme]['text-main']}
      />
      <View>
        <TextCustom type="bold">Still need help?</TextCustom>
        <LinkCustom href="/get-in-touch" text="Get in touch" />
      </View>
    </View>
  );
};

export default StillNeedHelpBlock;

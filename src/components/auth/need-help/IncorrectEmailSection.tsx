import { View } from 'react-native';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import StillNeedHelpBlock from '@/components/auth/need-help/StillNeedHelpBlock';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const IncorrectEmailSection = () => {
  const { theme } = useTheme();

  return (
    <View className="flex-1 gap-4">
      <View className="self-center">
        <TextCustom type="bold" size="l">
          Incorrect email?
        </TextCustom>
      </View>

      <View className="flex-row items-start gap-4">
        <MaterialCommunityIcons
          name="email-outline"
          size={23}
          color={themeColors[theme]['text-secondary']}
        />
        <View className="flex-1 gap-2">
          <TextCustom type="bold" size="l">
            Try a different email
          </TextCustom>
          <TextCustom size="l" color={themeColors[theme]['text-secondary']}>
            If you're not sure which email is linked to your account, try
            entering all of your email addresses.
          </TextCustom>
        </View>
      </View>

      <View className="flex-row items-start gap-4">
        <FontAwesome
          name="chain"
          size={23}
          color={themeColors[theme]['text-secondary']}
        />
        <View className="flex-1 gap-2">
          <TextCustom type="bold" size="l">
            Try another method
          </TextCustom>
          <TextCustom size="l" color={themeColors[theme]['text-secondary']}>
            Your account may be linked to another sign-in method. Have you tried
            to log via Facebook or Google?
          </TextCustom>
        </View>
      </View>

      <StillNeedHelpBlock />
    </View>
  );
};

export default IncorrectEmailSection;

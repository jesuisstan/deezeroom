import { View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import StillNeedHelpBlock from '@/components/auth/need-help/StillNeedHelpBlock';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const CanNotAccessEmailSection = () => {
  const { theme } = useTheme();

  return (
    <View className="flex-1 gap-4">
      <View className="self-center">
        <TextCustom type="bold" size="l">
          Can't access email?
        </TextCustom>
      </View>

      <View className="flex-row items-start gap-4">
        <MaterialIcons
          name="refresh"
          size={23}
          color={themeColors[theme]['text-secondary']}
        />
        <View className="flex-1 gap-2">
          <TextCustom type="bold" size="l">
            Regain email access
          </TextCustom>
          <TextCustom size="l" color={themeColors[theme]['text-secondary']}>
            Check with your email provider, they should be able to provide steps
            to regain access to your email.
          </TextCustom>
        </View>
      </View>

      <View className="flex-row items-start gap-4">
        <Ionicons
          name="add"
          size={23}
          color={themeColors[theme]['text-secondary']}
        />
        <View className="flex-1 gap-2">
          <TextCustom type="bold" size="l">
            Create a new account
          </TextCustom>
          <TextCustom size="l" color={themeColors[theme]['text-secondary']}>
            If all else fails, you can always{' '}
            <TextCustom
              type="link"
              onPress={() => router.push('/auth/register')}
            >
              create a new account
            </TextCustom>{' '}
            and start from scratch.
          </TextCustom>
        </View>
      </View>

      <StillNeedHelpBlock />
    </View>
  );
};

export default CanNotAccessEmailSection;

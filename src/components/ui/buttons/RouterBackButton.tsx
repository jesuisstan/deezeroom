import { Platform } from 'react-native';

import { Entypo } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import IconButton from '@/components/ui/buttons/IconButton';
import { Logger } from '@/modules/logger';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

type RouterBackButtonProps = {
  onPress?: () => void;
};

const RouterBackButton = ({ onPress }: RouterBackButtonProps) => {
  const router = useRouter();
  const { theme } = useTheme();

  const handleBackPress = () => {
    Logger.navigation.back('RouterBackButton');

    if (onPress) {
      onPress();
    } else {
      // On web, use window.history.back() to avoid triggering router.back()
      // The global error handler above will suppress badgin errors
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        }
      } else {
        // On mobile platforms, use router.back() as normal
        router.back();
      }
    }
  };

  return (
    <IconButton accessibilityLabel="Back" onPress={handleBackPress}>
      <Entypo
        name="chevron-thin-left"
        size={25}
        color={themeColors[theme]['text-main']}
      />
    </IconButton>
  );
};

export default RouterBackButton;

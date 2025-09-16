import { Entypo } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import IconButton from '@/components/ui/buttons/IconButton';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

type RouterBackButtonProps = {
  onPress?: () => void;
};

const RouterBackButton = ({ onPress }: RouterBackButtonProps) => {
  const router = useRouter();
  const { theme } = useTheme();

  const handleBackPress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
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

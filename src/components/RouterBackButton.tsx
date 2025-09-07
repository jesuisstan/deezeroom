import { Pressable, View } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

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
    <View className="h-12 w-12 overflow-hidden rounded-full bg-bg-main">
      <Pressable
        className="flex-1 items-center justify-center"
        onPress={handleBackPress}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        android_ripple={{
          color: themeColors[theme]['border'],
          borderless: false
        }}
      >
        <MaterialIcons
          name="chevron-left"
          size={42}
          color={themeColors[theme]['text-main']}
        />
      </Pressable>
    </View>
  );
};

export default RouterBackButton;

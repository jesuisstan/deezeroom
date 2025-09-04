import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const translateX = useSharedValue(isDark ? 46 : 3.5);

  useEffect(() => {
    translateX.value = withSpring(isDark ? 46 : 3.5, {
      damping: 15,
      stiffness: 150
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }]
    };
  });

  return (
    <Pressable
      onPress={toggleTheme}
      className="relative h-12 w-24 flex-row items-center justify-between rounded-full p-1"
      style={
        theme === 'dark'
          ? { backgroundColor: themeColors.dark.primary }
          : { backgroundColor: themeColors.light.primary }
      }
    >
      <Icon icon="sun" />
      <Icon icon="moon" />
      <Animated.View
        style={[animatedStyle]}
        className="absolute flex h-10 w-10 flex-row items-center justify-center rounded-full bg-accent"
      />
    </Pressable>
  );
};

const Icon = (props: any) => {
  return (
    <View className="relative z-50 flex h-10 w-10 flex-row items-center justify-center rounded-full">
      <Feather name={props.icon} size={18} color={themeColors.light.white} />
    </View>
  );
};

export default ThemeToggle;

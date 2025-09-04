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
      className="w-24 h-12 p-1 relative flex-row rounded-full items-center justify-between"
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
        className="w-10 h-10 bg-accent rounded-full items-center justify-center flex flex-row absolute"
      />
    </Pressable>
  );
};

const Icon = (props: any) => {
  return (
    <View className="w-10 h-10 relative z-50 rounded-full items-center justify-center flex flex-row">
      <Feather name={props.icon} size={18} color={themeColors.light.white} />
    </View>
  );
};

export default ThemeToggle;

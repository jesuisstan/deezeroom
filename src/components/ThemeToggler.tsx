import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const ThemeToggler = () => {
  const { theme, toggleTheme } = useTheme();
  const translateX = useSharedValue(theme === 'dark' ? 35.5 : 0);

  useEffect(() => {
    translateX.value = withSpring(theme === 'dark' ? 35.5 : 0, {
      damping: 80,
      stiffness: 800
    });
  }, [theme, translateX]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }]
    };
  });

  return (
    <BlurView
      intensity={8}
      className="relative h-9 w-[70px] overflow-hidden rounded-full border border-border bg-bg-secondary p-1"
    >
      <View className="relative flex-1 flex-row items-center">
        <Pressable
          className="absolute left-0 z-10 h-7 w-7 items-center justify-center rounded-full"
          onPress={toggleTheme}
          aria-label="light"
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="light"
        >
          <Feather
            name={'sun'}
            size={18}
            color={
              theme === 'light'
                ? themeColors[theme].primary
                : themeColors[theme]['border']
            }
          />
        </Pressable>
        <Pressable
          className="absolute right-0 z-10 h-7 w-7 items-center justify-center rounded-full"
          onPress={toggleTheme}
          aria-label="dark"
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="dark"
        >
          <Feather
            name={'moon'}
            size={18}
            color={
              theme === 'dark'
                ? themeColors[theme].primary
                : themeColors[theme]['border']
            }
          />
        </Pressable>

        {/* Animated background indicator */}
        <Animated.View
          style={animatedStyle}
          className="absolute z-[1] h-7 w-7 rounded-full border border-border bg-bg-tertiary"
        />
      </View>
    </BlurView>
  );
};

export default ThemeToggler;

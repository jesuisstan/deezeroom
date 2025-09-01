import { Pressable, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeProvider';
import Feather from '@expo/vector-icons/Feather';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { useEffect } from 'react';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const translateX = useSharedValue(isDark ? 46 : 3.5);

  useEffect(() => {
    translateX.value = withSpring(isDark ? 46 : 3.5, {
      damping: 15,
      stiffness: 150
    });
  }, [isDark]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }]
    };
  });

  return (
    <Pressable
      onPress={toggleTheme}
      className="w-24 h-12 p-1 bg-secondary relative flex-row rounded-full items-center justify-between"
    >
      <Icon icon="sun" />
      <Icon icon="moon" />
      <Animated.View
        style={[animatedStyle]}
        className="w-10 h-10 bg-background rounded-full items-center justify-center flex flex-row absolute"
      />
    </Pressable>
  );
};

const Icon = (props: any) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <View className="w-10 h-10 relative z-50 rounded-full items-center justify-center flex flex-row">
      <Feather
        name={props.icon}
        size={20}
        color={`${isDark ? 'white' : 'black'}`}
      />
    </View>
  );
};

export default ThemeToggle;

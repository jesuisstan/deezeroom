import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const Icon = (props: any) => {
  return (
    <Feather name={props.icon} size={20} color={themeColors.dark.primary} />
  );
};

const ThemeToggler = () => {
  const { theme, toggleTheme } = useTheme();
  const translateX = useSharedValue(theme === 'dark' ? 32 : 0);

  useEffect(() => {
    translateX.value = withSpring(theme === 'dark' ? 32 : 0, {
      damping: 15,
      stiffness: 200
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
      style={styles.container}
      className="border-border bg-bg-secondary"
    >
      <View style={styles.innerContainer}>
        <Pressable
          style={[styles.button, styles.buttonLeft]}
          onPress={toggleTheme}
          aria-label="light"
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="light"
        >
          <Icon icon="sun" />
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonRight]}
          onPress={toggleTheme}
          aria-label="dark"
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="dark"
        >
          <Icon icon="moon" />
        </Pressable>

        {/* Animated background indicator */}
        <Animated.View
          style={[styles.activeIndicator, animatedStyle]}
          className="border-border bg-bg-main"
        />
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 9999,
    borderWidth: 1,
    //borderColor: 'rgba(37, 40, 43, 0.1)',
    //backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 4,
    marginLeft: 8,
    marginRight: 8,
    overflow: 'hidden',
    position: 'relative',
    height: 36,
    width: 72
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    flex: 1,
    paddingHorizontal: 4
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  buttonLeft: {
    position: 'absolute',
    left: -0.5
  },
  buttonRight: {
    position: 'absolute',
    right: -1
  },
  activeIndicator: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 9999,
    borderWidth: 1,
    //backgroundColor: '#E6E6E6',
    zIndex: 1
  }
});

export default ThemeToggler;

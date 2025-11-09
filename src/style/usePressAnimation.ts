import { useEffect } from 'react';

import { useSharedValue } from 'react-native-reanimated';
import {
  useAnimatedStyle,
  withSpring,
  withTiming
} from 'react-native-reanimated';

interface UsePressAnimationOptions {
  scale?: number;
  opacity?: number;
  damping?: number;
  stiffness?: number;
  appearAnimation?: boolean;
  appearDelay?: number;
  appearDuration?: number;
}

export const usePressAnimation = (options: UsePressAnimationOptions = {}) => {
  const {
    scale: scaleValue = 0.98,
    opacity: opacityValue = 0.8,
    damping = 15,
    stiffness = 300,
    appearAnimation = false,
    appearDelay = 0,
    appearDuration = 600
  } = options;

  const scale = useSharedValue(appearAnimation ? 0.95 : 1);
  const opacity = useSharedValue(appearAnimation ? 0 : 1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  // Initial animation - only run once on mount, not on every render
  useEffect(() => {
    if (appearAnimation) {
      const timer = setTimeout(() => {
        scale.value = withTiming(1, { duration: appearDuration });
        opacity.value = withTiming(1, { duration: appearDuration });
      }, appearDelay);

      return () => clearTimeout(timer);
    }
    // Empty dependency array - only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(scaleValue, { damping, stiffness });
    opacity.value = withSpring(opacityValue, { damping, stiffness });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping, stiffness });
    opacity.value = withSpring(1, { damping, stiffness });
  };

  return {
    animatedStyle,
    handlePressIn,
    handlePressOut
  };
};

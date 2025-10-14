import { useSharedValue } from 'react-native-reanimated';
import { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface UsePressAnimationOptions {
  scale?: number;
  opacity?: number;
  damping?: number;
  stiffness?: number;
}

export const usePressAnimation = (options: UsePressAnimationOptions = {}) => {
  const {
    scale: scaleValue = 0.98,
    opacity: opacityValue = 0.8,
    damping = 15,
    stiffness = 300
  } = options;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

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

import React, { useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  View
} from 'react-native';

import clsx from 'clsx';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

type IconButtonProps = {
  accessibilityLabel: string;
  onPress?: (event: GestureResponderEvent) => void;
  className?: string;
  backgroundColor?: string;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
};

const IconButton = ({
  onPress,
  accessibilityLabel,
  className,
  backgroundColor,
  children,
  disabled = false,
  loading = false
}: IconButtonProps) => {
  const { theme } = useTheme();
  const [sizeLayout, setSizeLayout] = useState({ width: 0, height: 0 });

  // Ripple animation values
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  // Overlay animation value (used for "pressed" darkening)
  const overlayOpacity = useSharedValue(0);

  // Animated style for ripple
  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value
  }));

  // Animated style for overlay
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSizeLayout({ width, height });
  };

  const startRipple = () => {
    if (disabled || loading) return;

    // show overlay quickly when finger pressed
    overlayOpacity.value = withTiming(0.12, {
      duration: 80,
      easing: Easing.out(Easing.quad)
    });

    // reset and run ripple
    rippleScale.value = 0;
    rippleOpacity.value = 0.25;
    rippleScale.value = withTiming(2.5, {
      duration: 180,
      easing: Easing.out(Easing.quad)
    });
    rippleOpacity.value = withDelay(
      120,
      withTiming(0, {
        duration: 160,
        easing: Easing.out(Easing.quad)
      })
    );
  };

  const endPress = () => {
    // hide overlay when finger released
    overlayOpacity.value = withTiming(0, {
      duration: 120,
      easing: Easing.out(Easing.quad)
    });

    // optional: ensure ripple fades (safety)
    rippleOpacity.value = withTiming(0, { duration: 120 });
  };

  return (
    <View
      className={clsx('h-12 w-12 overflow-hidden rounded-full', className)}
      style={{
        backgroundColor: backgroundColor || themeColors[theme]['transparent']
      }}
    >
      <Pressable
        className="flex-1 items-center justify-center"
        onPress={onPress}
        onPressIn={startRipple}
        onPressOut={endPress}
        onLayout={handleLayout}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={disabled || loading}
        style={{ opacity: disabled || loading ? 0.6 : 1 }}
      >
        {/* Overlay to darken the button while pressed.
            Rendered BEFORE ripple so ripple appears on top of overlay. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: themeColors[theme]['bg-inverse']
            },
            overlayStyle
          ]}
        />

        {/* Ripple effect */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: sizeLayout.height / 2 - sizeLayout.height,
              left: sizeLayout.width / 2 - sizeLayout.width,
              width: sizeLayout.width * 2,
              height: sizeLayout.height * 2,
              borderRadius: sizeLayout.width,
              backgroundColor: themeColors[theme]['bg-inverse']
            },
            rippleStyle
          ]}
        />

        {/* Content: Loading indicator or children */}
        {loading ? (
          <ActivityIndicator
            size="small"
            color={themeColors[theme]['primary']}
          />
        ) : (
          children
        )}
      </Pressable>
    </View>
  );
};

export default IconButton;

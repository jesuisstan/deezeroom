import React, { useState } from 'react';
import {
  ActivityIndicator,
  DimensionValue,
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  View,
  Platform
} from 'react-native';

import clsx from 'clsx';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface RippleButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  width?: 'auto' | 'full' | DimensionValue;
  color?: string;
}

const baseClasses =
  'relative overflow-hidden flex-row items-center justify-center rounded-xl transition-all duration-200';

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-6 py-1 gap-2 min-h-[30px]',
  md: 'px-8 py-2 gap-2.5 min-h-[40px]',
  lg: 'px-10 py-3 gap-3 min-h-[48px]'
};

const RippleButton: React.FC<RippleButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'lg',
  leftIcon,
  rightIcon,
  className,
  width = 'auto',
  color
}) => {
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

  // Variant classes (border/bg)
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'disabled:bg-disabled',
    secondary: 'disabled:bg-disabled',
    outline:
      'bg-transparent border border-border active:bg-bg-tertiary-hover/10',
    ghost: 'bg-transparent active:bg-border/10'
  };

  // Width styles
  const getWidthStyle = (): { width?: DimensionValue } => {
    if (width === 'full') return { width: '100%' };
    if (width === 'auto') return {};
    return { width };
  };

  // Container classes
  const containerClasses = clsx(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    disabled ? 'opacity-60' : 'opacity-100',
    className
  );

  // Text color depending on variant
  const textColorByVariant: Record<ButtonVariant, string> = {
    primary: disabled ? themeColors[theme].black : themeColors[theme].white,
    secondary: themeColors[theme]['text-main'],
    outline: themeColors[theme]['text-main'],
    ghost: themeColors[theme]['text-main']
  };

  // Background color logic
  const backgroundColor = (() => {
    if (variant === 'primary') {
      return disabled
        ? themeColors[theme].disabled
        : color || themeColors[theme].primary;
    }
    if (variant === 'secondary') {
      return color || themeColors[theme]['bg-secondary'];
    }
    return 'transparent';
  })();

  return (
    <View className="overflow-hidden rounded-xl" style={getWidthStyle()}>
      {Platform.OS === 'web' ? (
        <View
          className={containerClasses}
          onStartShouldSetResponder={() => true}
          onResponderGrant={startRipple}
          onResponderRelease={(e) => {
            endPress();
            if (!disabled && !loading) {
              // @ts-expect-error onPress expects GestureResponderEvent
              onPress?.(e);
            }
          }}
          onResponderTerminate={endPress}
          onLayout={handleLayout}
          // keep base backgroundColor here so nativewind classes are preserved
          style={{ backgroundColor }}
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

          {/* Left Icon */}
          {leftIcon && <View className="mr-1.5">{leftIcon}</View>}

          {/* Label or Loader */}
          {loading ? (
            <ActivityIndicator
              size="small"
              color={
                variant === 'primary'
                  ? themeColors[theme].white
                  : themeColors[theme]['text-main']
              }
            />
          ) : (
            <TextCustom
              type="bold"
              size={size === 'lg' ? 'l' : 'm'}
              color={
                disabled
                  ? themeColors[theme]['text-main']
                  : textColorByVariant[variant]
              }
            >
              {title}
            </TextCustom>
          )}

          {/* Right Icon */}
          {rightIcon && <View className="ml-1.5">{rightIcon}</View>}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onPress}
          onPressIn={startRipple}
          onPressOut={endPress}
          onLayout={handleLayout}
          disabled={disabled || loading}
          className={containerClasses}
          // keep base backgroundColor here so nativewind classes are preserved
          style={{ backgroundColor }}
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

          {/* Left Icon */}
          {leftIcon && <View className="mr-1.5">{leftIcon}</View>}

          {/* Label or Loader */}
          {loading ? (
            <ActivityIndicator
              size="small"
              color={
                variant === 'primary'
                  ? themeColors[theme].white
                  : themeColors[theme]['text-main']
              }
            />
          ) : (
            <TextCustom
              type="bold"
              size={size === 'lg' ? 'l' : 'm'}
              color={
                disabled
                  ? themeColors[theme]['text-main']
                  : textColorByVariant[variant]
              }
            >
              {title}
            </TextCustom>
          )}

          {/* Right Icon */}
          {rightIcon && <View className="ml-1.5">{rightIcon}</View>}
        </Pressable>
      )}
    </View>
  );
};

export default RippleButton;

import React, { useEffect } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const ActivityIndicatorScreen = () => {
  const { theme } = useTheme();

  // Animation for logo - optimized for short display
  const logoScale = useSharedValue(0.9);
  const logoOpacity = useSharedValue(1.0);

  // Start animation when component mounts
  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 600 }),
        withTiming(0.9, { duration: 600 })
      ),
      -1,
      false
    );

    logoOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 600 }),
        withTiming(1.0, { duration: 600 })
      ),
      -1,
      false
    );
  }, [logoScale, logoOpacity]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value
  }));

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          theme === 'dark'
            ? themeColors.dark['bg-main']
            : themeColors.light['bg-main']
      }}
    >
      <View className="items-center gap-6">
        {/* Animated Logo */}
        <Animated.View style={logoAnimatedStyle}>
          <Image
            source={require('@/assets/images/logo/logo-heart-transparent.png')}
            style={{
              width: 80,
              height: 80,
              resizeMode: 'contain'
            }}
          />
        </Animated.View>

        {/* Loading indicator */}
        <ActivityIndicator size="large" color={themeColors[theme].primary} />
      </View>
    </View>
  );
};

export default ActivityIndicatorScreen;

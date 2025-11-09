import { useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';

import { type Href, router } from 'expo-router';
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

type LinkParams = Record<string, string | number | boolean>;

type Props = {
  href: Href;
  text: string;
  params?: LinkParams;
};

const stringifyParams = (
  params?: LinkParams
): Record<string, string> | undefined => {
  if (!params) return undefined;
  const out: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    out[k] = String(v);
  });
  return out;
};

const LinkCustom = ({ href, text, params }: Props) => {
  const { theme } = useTheme();
  const [sizeLayout, setSizeLayout] = useState({ width: 0, height: 0 });

  // Ripple animation values
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  // Animated style for ripple
  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSizeLayout({ width, height });
  };

  const startRipple = () => {
    // Reset and run ripple
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

  const handlePress = () => {
    if (!params) {
      router.push(href);
      return;
    }

    const sp = stringifyParams(params);
    if (typeof href === 'string') {
      router.push({ pathname: href as any, params: sp });
    } else {
      // Merge with existing params if provided as object
      const hrefObj: any = href as any;
      router.push({
        ...hrefObj,
        params: { ...(hrefObj.params || {}), ...(sp || {}) }
      });
    }
  };

  return (
    <View className="self-start overflow-hidden rounded-md">
      <Pressable
        accessibilityRole="link"
        onPress={handlePress}
        onPressIn={startRipple}
        onLayout={handleLayout}
        hitSlop={8}
      >
        {/* Ripple effect */}
        <Animated.View
          className="rounded-md"
          style={[
            {
              position: 'absolute',
              top: sizeLayout.height / 2 - sizeLayout.height,
              left: sizeLayout.width / 2 - sizeLayout.width,
              width: sizeLayout.width * 2,
              height: sizeLayout.height * 2,
              backgroundColor: themeColors[theme]['bg-inverse']
            },
            rippleStyle
          ]}
        />

        <TextCustom type="link">{text}</TextCustom>
      </Pressable>
    </View>
  );
};

export default LinkCustom;

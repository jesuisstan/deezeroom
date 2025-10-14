import React, { useEffect } from 'react';
import { View } from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import { TextCustom } from '@/components/ui/TextCustom';

interface AnimatedTrackTitleProps {
  title: string;
  textColor: string;
}

const AnimatedTrackTitle: React.FC<AnimatedTrackTitleProps> = ({
  title,
  textColor
}) => {
  const translateX = useSharedValue(0);
  const [shouldAnimate, setShouldAnimate] = React.useState(false);
  const [isEllipsized, setIsEllipsized] = React.useState(false);
  const [textWidth, setTextWidth] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);

  // Define if animation is needed
  useEffect(() => {
    const needsAnimation =
      isEllipsized ||
      (textWidth > containerWidth && textWidth > 0 && containerWidth > 0);

    if (needsAnimation) {
      console.log(
        `Starting animation for: "${title}" (ellipsized: ${isEllipsized}, textWidth: ${textWidth}, containerWidth: ${containerWidth})`
      );
      setShouldAnimate(true);
      // Start animation with delay
      const timer = setTimeout(() => {
        translateX.value = withRepeat(
          withTiming(-50, { duration: 3000 }),
          -1,
          true
        );
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      console.log(
        `No animation needed for: "${title}" (ellipsized: ${isEllipsized}, textWidth: ${textWidth}, containerWidth: ${containerWidth})`
      );
      setShouldAnimate(false);
      translateX.value = withTiming(0, { duration: 200 });
    }
  }, [isEllipsized, textWidth, containerWidth, translateX, title]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }]
    };
  });

  return (
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      {shouldAnimate ? (
        <Animated.View style={animatedStyle}>
          <TextCustom
            type="semibold"
            size="s"
            color={textColor}
            numberOfLines={1}
          >
            {title}
          </TextCustom>
        </Animated.View>
      ) : (
        <View>
          <TextCustom
            type="semibold"
            size="s"
            color={textColor}
            numberOfLines={1}
            ellipsizeMode="tail"
            onTextLayout={(event) => {
              const { lines } = event.nativeEvent;
              const isTextEllipsized =
                lines.length > 0 && lines[0].text.length < title.length;
              console.log(
                `Text ellipsized for "${title}": ${isTextEllipsized}`
              );
              setIsEllipsized(isTextEllipsized);
            }}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              setTextWidth(width);
            }}
          >
            {title}
          </TextCustom>
        </View>
      )}
    </View>
  );
};

export default AnimatedTrackTitle;

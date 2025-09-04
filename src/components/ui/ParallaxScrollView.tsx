import { StyleSheet, View } from 'react-native';

import type { PropsWithChildren, ReactElement } from 'react';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset
} from 'react-native-reanimated';

import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useTheme } from '@/providers/ThemeProvider';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor
}: Props) {
  const { theme } = useTheme();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const bottom = useBottomTabOverflow();
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          )
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [2, 1, 1]
          )
        }
      ]
    };
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom }}
      >
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[theme] },
            headerAnimatedStyle
          ]}
        >
          {headerImage}
        </Animated.View>
        <View style={styles.content}>{children}</View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden'
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden'
  }
});

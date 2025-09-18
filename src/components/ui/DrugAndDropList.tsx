import { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from 'react-native';

import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView
} from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

type Row = { key: string; label: string };

const SEPARATOR_HEIGHT = 16;

export default function Debug() {
  const [items, setItems] = useState<Row[]>(
    Array.from({ length: 20 }, (_, i) => ({
      key: String(i),
      label: `Row ${i + 1}`
    }))
  );

  const contentContainerStyle: StyleProp<ViewStyle> = {
    gap: SEPARATOR_HEIGHT,
    paddingBottom: SEPARATOR_HEIGHT
  };

  const draggedIndex = useSharedValue<number | null>(null);
  const offsetY = useSharedValue(0);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const newItems = [...prev];

      newItems.splice(toIndex, 0, newItems.splice(fromIndex, 1)[0]);
      draggedIndex.value = null;
      offsetY.value = 0;

      return newItems;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={contentContainerStyle}>
          <View style={styles.header}>
            <Text>Header</Text>
          </View>
          {items.map((item, index) => (
            <Item
              key={item.key}
              item={item}
              index={index}
              draggedIndex={draggedIndex}
              offsetY={offsetY}
              moveItem={moveItem}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

type ItemProps = {
  item: Row;
  index: number;
  draggedIndex: SharedValue<number | null>;
  offsetY: SharedValue<number>;
  moveItem: (fromIndex: number, toIndex: number) => void;
};
const useItem = ({ index, draggedIndex, offsetY, moveItem }: ItemProps) => {
  const itemHeight = useSharedValue(0);
  const startY = useSharedValue(0);

  const getUpdatedOffsetY = useCallback(
    (translationY: number) => {
      'worklet';

      return Math.max(
        -index * (itemHeight.value + SEPARATOR_HEIGHT),
        translationY + startY.value
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index]
  );

  const movingDirection = useDerivedValue(() => {
    'worklet';

    if (draggedIndex.value === null) return 0;

    const initialDraggedY =
      draggedIndex.value * (itemHeight.value + SEPARATOR_HEIGHT);
    const currentY = index * (itemHeight.value + SEPARATOR_HEIGHT);

    if (
      initialDraggedY < currentY &&
      currentY < initialDraggedY + offsetY.value + itemHeight.value / 2
    )
      return -1;
    if (
      initialDraggedY + offsetY.value - itemHeight.value / 2 <= currentY &&
      currentY < initialDraggedY
    )
      return 1;

    return 0;
  });

  const nextIndexToInsertAt = useDerivedValue(() => {
    'worklet';

    if (draggedIndex.value === null) return index;

    const initialDraggedY =
      draggedIndex.value * (itemHeight.value + SEPARATOR_HEIGHT);

    return Math.round(
      (initialDraggedY + offsetY.value) / (itemHeight.value + SEPARATOR_HEIGHT)
    );
  });

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onBegin(() => {
      draggedIndex.value = index;
    })
    .onUpdate((e) => {
      offsetY.value = getUpdatedOffsetY(e.translationY);
    })
    .onEnd(() => {
      if (draggedIndex.value === null) return;

      const indexOffset = nextIndexToInsertAt.value - draggedIndex.value;

      const targetOffsetY = indexOffset * (itemHeight.value + SEPARATOR_HEIGHT);

      offsetY.value = withSpring(targetOffsetY, {}, () => {
        if (draggedIndex.value === null) return;
        runOnJS(moveItem)(draggedIndex.value, nextIndexToInsertAt.value);
      });
    })
    .onFinalize(() => {});

  const translateY = useDerivedValue(() => {
    'worklet';

    if (draggedIndex.value === null) return 0;
    if (draggedIndex.value === index) return withSpring(offsetY.value);

    return withSpring(
      movingDirection.value * (itemHeight.value + SEPARATOR_HEIGHT)
    );
  });

  const animatedStyle = useAnimatedStyle(() => {
    const isBeingDragged = draggedIndex.value === index;

    return {
      transform: [{ translateY: translateY.value }],
      zIndex: isBeingDragged ? 10 : 0,
      backgroundColor: isBeingDragged ? '#f9f9f9' : '#d2d2d2'
    };
  });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    itemHeight.value = event.nativeEvent.layout.height;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    animatedStyle,
    onLayout,
    panGesture
  };
};

/**
 * by **David Guerin - Senior React Native Developer | Contractor | Mobile App Specialist**
 *
 * For any help developing your mobile app,
 * hit me up at david@devitgo.com or check my website https://devitgo.com
 */
const Item = ({ item, index, draggedIndex, offsetY, moveItem }: ItemProps) => {
  const { animatedStyle, onLayout, panGesture } = useItem({
    item,
    index,
    draggedIndex,
    offsetY,
    moveItem
  });

  return (
    <Animated.View onLayout={onLayout} style={[styles.item, animatedStyle]}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.handle} />
      </GestureDetector>
      <Text style={styles.text}>{item.label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  item: {
    padding: 16,
    backgroundColor: '#d2d2d2',
    borderRadius: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 16
  },
  header: {
    padding: 16,
    backgroundColor: '#d2d2d2',
    borderRadius: 16,
    height: 400,
    marginHorizontal: 16,
    marginTop: 16
  },
  text: { fontSize: 16, userSelect: 'none' },
  handle: { width: 16, height: 16, backgroundColor: '#dcdcdc' }
});

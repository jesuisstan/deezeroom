import React, { useCallback, useMemo } from 'react';
import { LayoutChangeEvent, View } from 'react-native';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

import TrackCard from '@/components/search-tracks/TrackCard';
import { Track } from '@/graphql/schema';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const SEPARATOR_HEIGHT = 0; // No gap between tracks in playlist

interface DraggableTracksListProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPress: (track: Track) => void;
  onRemove: (track: Track) => void;
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>;
  canEdit: boolean;
  draggedIndex: SharedValue<number | null>;
  offsetY: SharedValue<number>;
  tracksCount: number; // Total number of tracks for clamping
}

interface DraggableTrackItemProps {
  track: Track;
  index: number;
  currentTrackId?: string;
  isPlaying: boolean;
  onPress: (track: Track) => void;
  onRemove: (track: Track) => void;
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>;
  canEdit: boolean;
  draggedIndex: SharedValue<number | null>;
  offsetY: SharedValue<number>;
  tracksCount: number;
}

const useDraggableTrackItem = ({
  index,
  draggedIndex,
  offsetY,
  onReorder,
  canEdit,
  tracksCount
}: {
  index: number;
  draggedIndex: SharedValue<number | null>;
  offsetY: SharedValue<number>;
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>;
  canEdit: boolean;
  tracksCount: number;
}) => {
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

    const calculatedIndex = Math.round(
      (initialDraggedY + offsetY.value) / (itemHeight.value + SEPARATOR_HEIGHT)
    );
    return Math.max(0, Math.min(calculatedIndex, tracksCount - 1));
  });

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      try {
        await onReorder(fromIndex, toIndex);
      } catch (error) {
        // Error is handled by parent component
        console.error('Error reordering track:', error);
      }
    },
    [onReorder]
  );

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .enabled(canEdit) // Only allow dragging if user can edit
    .onBegin(() => {
      draggedIndex.value = index;
    })
    .onUpdate((e) => {
      offsetY.value = getUpdatedOffsetY(e.translationY);
    })
    .onEnd(() => {
      if (draggedIndex.value === null) return;

      const targetIndex = nextIndexToInsertAt.value;
      const sourceIndex = draggedIndex.value;

      // Only reorder if position actually changed
      if (sourceIndex !== targetIndex) {
        const indexOffset = targetIndex - sourceIndex;
        const targetOffsetY =
          indexOffset * (itemHeight.value + SEPARATOR_HEIGHT);

        // Calculate the final visual position
        // This offset represents where the item should be in its new position
        const finalOffsetY = targetOffsetY;

        // Animate to final position and call reorder
        // Keep draggedIndex set until reorder completes to maintain visual position
        offsetY.value = withSpring(finalOffsetY, {
          damping: 15,
          stiffness: 300
        });

        // Call reorder immediately (optimistic update will maintain position)
        runOnJS(handleReorder)(sourceIndex, targetIndex);
      } else {
        // Reset if no change
        draggedIndex.value = null;
        offsetY.value = withSpring(0);
      }
    })
    .onFinalize(() => {
      // Reset on cancel/interrupt
      if (draggedIndex.value === index) {
        draggedIndex.value = null;
        offsetY.value = 0;
      }
    });

  const translateY = useDerivedValue(() => {
    'worklet';

    if (draggedIndex.value === null) return 0;
    if (draggedIndex.value === index) return offsetY.value;

    return movingDirection.value * (itemHeight.value + SEPARATOR_HEIGHT);
  });

  const animatedStyle = useAnimatedStyle(() => {
    const isBeingDragged = draggedIndex.value === index;

    return {
      transform: [{ translateY: translateY.value }],
      zIndex: isBeingDragged ? 10 : 0,
      opacity: isBeingDragged ? 0.95 : 1
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

const DraggableTrackItem: React.FC<DraggableTrackItemProps> = ({
  track,
  index,
  currentTrackId,
  isPlaying,
  onPress,
  onRemove,
  onReorder,
  canEdit,
  draggedIndex,
  offsetY,
  tracksCount
}) => {
  const { theme } = useTheme();
  const { animatedStyle, onLayout, panGesture } = useDraggableTrackItem({
    index,
    draggedIndex,
    offsetY,
    onReorder,
    canEdit,
    tracksCount
  });

  const isDragging = useDerivedValue(() => draggedIndex.value === index);

  const dragHandleStyle = useAnimatedStyle(() => {
    const isDragged = isDragging.value;
    return {
      opacity: canEdit ? (isDragged ? 1 : 0.3) : 0
    };
  });

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        {
          marginBottom: SEPARATOR_HEIGHT
        },
        animatedStyle
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <TrackCard
            track={track}
            isPlaying={currentTrackId === track.id && isPlaying}
            onPress={onPress}
            onRemove={onRemove}
          />
        </View>
        {/* Drag Handle - only visible when canEdit, positioned on the right */}
        {canEdit && (
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                {
                  width: 32,
                  paddingLeft: 4,
                  paddingRight: 8,
                  alignItems: 'center',
                  justifyContent: 'center'
                },
                dragHandleStyle
              ]}
            >
              <View
                style={{
                  width: 4,
                  height: 24,
                  borderRadius: 2,
                  backgroundColor: themeColors[theme]['text-secondary']
                }}
              />
              <View
                style={{
                  width: 4,
                  height: 24,
                  borderRadius: 2,
                  backgroundColor: themeColors[theme]['text-secondary'],
                  marginTop: 4
                }}
              />
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </Animated.View>
  );
};

const DraggableTracksList: React.FC<DraggableTracksListProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  onPress,
  onRemove,
  onReorder,
  canEdit,
  draggedIndex,
  offsetY,
  tracksCount
}) => {
  return (
    <View>
      {tracks.map((track, index) => (
        <DraggableTrackItem
          key={track.id}
          track={track}
          index={index}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onPress={onPress}
          onRemove={onRemove}
          onReorder={onReorder}
          canEdit={canEdit}
          draggedIndex={draggedIndex}
          offsetY={offsetY}
          tracksCount={tracksCount}
        />
      ))}
    </View>
  );
};

export default DraggableTracksList;

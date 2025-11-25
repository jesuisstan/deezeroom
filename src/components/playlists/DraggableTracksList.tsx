import React, { useCallback } from 'react';
import { Dimensions, LayoutChangeEvent, View } from 'react-native';

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
import { Track } from '@/graphql/types-return';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { PlaylistTrackPosition } from '@/utils/firebase/firebase-service-playlists';

const SEPARATOR_HEIGHT = 0; // No gap between tracks in playlist
const AUTO_SCROLL_THRESHOLD = 80;
const AUTO_SCROLL_STEP = 18;
const WINDOW_HEIGHT = Dimensions.get('window').height;

interface DraggableTracksListProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying: boolean;
  onPress: (track: Track) => void;
  onRemove: (track: Track) => void;
  onReorder: (
    trackId: string,
    targetPosition: PlaylistTrackPosition
  ) => Promise<void>;
  canEdit: boolean;
  draggedIndex: SharedValue<number | null>;
  offsetY: SharedValue<number>;
  autoScroll?: (delta: number) => void;
  scrollOffsetY?: SharedValue<number>;
}

interface DraggableTrackItemProps {
  track: Track;
  index: number;
  tracks: Track[]; // Full tracks array to determine relative position
  currentTrackId?: string;
  isPlaying: boolean;
  onPress: (track: Track) => void;
  onRemove: (track: Track) => void;
  onReorder: (
    trackId: string,
    targetPosition: PlaylistTrackPosition
  ) => Promise<void>;
  canEdit: boolean;
  draggedIndex: SharedValue<number | null>;
  offsetY: SharedValue<number>;
  autoScroll?: (delta: number) => void;
  scrollOffsetY?: SharedValue<number>;
}

const useDraggableTrackItem = ({
  index,
  trackId,
  tracks,
  draggedIndex,
  offsetY,
  onReorder,
  canEdit,
  autoScroll,
  scrollOffsetY
}: {
  index: number;
  trackId: string;
  tracks: Track[];
  draggedIndex: SharedValue<number | null>;
  offsetY: SharedValue<number>;
  onReorder: (
    trackId: string,
    targetPosition: PlaylistTrackPosition
  ) => Promise<void>;
  canEdit: boolean;
  autoScroll?: (delta: number) => void;
  scrollOffsetY?: SharedValue<number>;
}) => {
  const itemHeight = useSharedValue(0);
  const startScrollOffset = useSharedValue(0);

  const getUpdatedOffsetY = useCallback(
    (translationY: number) => {
      'worklet';
      return Math.max(
        -index * (itemHeight.value + SEPARATOR_HEIGHT),
        translationY
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

    const totalCount = tracks.length;
    const initialDraggedY =
      draggedIndex.value * (itemHeight.value + SEPARATOR_HEIGHT);

    const calculatedIndex = Math.round(
      (initialDraggedY + offsetY.value) / (itemHeight.value + SEPARATOR_HEIGHT)
    );
    return Math.max(0, Math.min(calculatedIndex, totalCount));
  });

  const handleAutoScroll = useCallback(
    (absoluteY: number) => {
      if (!autoScroll) return;

      if (absoluteY < AUTO_SCROLL_THRESHOLD) {
        autoScroll(-AUTO_SCROLL_STEP);
      } else if (absoluteY > WINDOW_HEIGHT - AUTO_SCROLL_THRESHOLD) {
        autoScroll(AUTO_SCROLL_STEP);
      }
    },
    [autoScroll]
  );

  const handleReorder = useCallback(
    async (targetIndex: number) => {
      const totalCount = tracks.length;

      if (totalCount <= 1) {
        return;
      }

      const clampedTarget = Math.max(0, Math.min(targetIndex, totalCount));
      const desiredIndex =
        clampedTarget >= totalCount
          ? Math.max(totalCount - 1, 0)
          : clampedTarget;

      if (desiredIndex === index) {
        return;
      }

      const tracksWithoutCurrent = tracks.filter((_, idx) => idx !== index);

      if (tracksWithoutCurrent.length !== totalCount - 1) {
        return;
      }

      const insertionIndex = Math.max(
        0,
        Math.min(desiredIndex, tracksWithoutCurrent.length)
      );

      let targetPosition: PlaylistTrackPosition;

      if (tracksWithoutCurrent.length === 0 || insertionIndex <= 0) {
        targetPosition = { placement: 'start' };
      } else if (insertionIndex >= tracksWithoutCurrent.length) {
        targetPosition = { placement: 'end' };
      } else {
        const beforeTrack = tracksWithoutCurrent[insertionIndex - 1];
        if (!beforeTrack) {
          return;
        }
        targetPosition = {
          placement: 'after',
          referenceId: beforeTrack.id
        };
      }

      try {
        await onReorder(trackId, targetPosition);
      } catch (error) {
        // Error is handled by parent component
        console.error('Error reordering track:', error);
      }
    },
    [tracks, index, onReorder, trackId]
  );

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .enabled(canEdit) // Only allow dragging if user can edit
    .onBegin(() => {
      draggedIndex.value = index;
      startScrollOffset.value = scrollOffsetY?.value ?? 0;
    })
    .onUpdate((e) => {
      const currentScroll = scrollOffsetY?.value ?? 0;
      const scrollDelta = currentScroll - startScrollOffset.value;
      const translationWithScroll = e.translationY + scrollDelta;

      offsetY.value = getUpdatedOffsetY(translationWithScroll);

      if (autoScroll) {
        runOnJS(handleAutoScroll)(e.absoluteY);
      }
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
        // Pass trackId instead of sourceIndex for more reliable conflict handling
        runOnJS(handleReorder)(targetIndex);
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
  tracks,
  currentTrackId,
  isPlaying,
  onPress,
  onRemove,
  onReorder,
  canEdit,
  draggedIndex,
  offsetY,
  autoScroll,
  scrollOffsetY
}) => {
  const { theme } = useTheme();
  const { animatedStyle, onLayout, panGesture } = useDraggableTrackItem({
    index,
    trackId: track.id,
    tracks,
    draggedIndex,
    offsetY,
    onReorder,
    canEdit,
    autoScroll,
    scrollOffsetY
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
                  //paddingLeft: 4,
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
  autoScroll,
  scrollOffsetY
}) => {
  return (
    <View>
      {tracks.map((track, index) => (
        <DraggableTrackItem
          key={track.id}
          track={track}
          index={index}
          tracks={tracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          onPress={onPress}
          onRemove={onRemove}
          onReorder={onReorder}
          canEdit={canEdit}
          draggedIndex={draggedIndex}
          offsetY={offsetY}
          autoScroll={autoScroll}
          scrollOffsetY={scrollOffsetY}
        />
      ))}
    </View>
  );
};

export default DraggableTracksList;

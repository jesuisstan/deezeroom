/* eslint-disable prettier/prettier */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, View } from 'react-native';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import { TextCustom } from '@/components/ui/TextCustom';
import {
  useAudioStatus,
  usePlaybackActions
} from '@/providers/PlaybackProvider';
import { themeColors } from '@/style/color-theme';

type ProgressBarProps = {
  theme: keyof typeof themeColors;
  trackDuration?: number; // Fallback duration from track metadata
  layout?: 'stacked' | 'inline';
};

const TRACK_HEIGHT = 3;
const TRACK_HOVER_SCALE = 1.4;
const HANDLE_SIZE = 12;
const HANDLE_ACTIVE_SCALE = 1.3;
const HANDLE_HOVER_SCALE = 1.1;
const HANDLE_TOUCH_HEIGHT = 32;
const DRAG_TEXT_THROTTLE_MS = 60;
const IS_WEB = Platform.OS === 'web';

const formatTime = (valueInSeconds: number) => {
  const totalSeconds = Number.isFinite(valueInSeconds)
    ? Math.max(0, Math.floor(valueInSeconds))
    : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const ProgressBarComponent = ({
  theme,
  trackDuration,
  layout = 'stacked'
}: ProgressBarProps) => {
  const { status } = useAudioStatus();
  const { seekTo } = usePlaybackActions();

  const progressRatio = useSharedValue(0);
  const barWidthShared = useSharedValue(0);
  const durationShared = useSharedValue(0);
  const isDraggingShared = useSharedValue(0);
  const isHoveringShared = useSharedValue(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewSeconds, setDragPreviewSeconds] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const isDraggingRef = useRef(false);
  const dragUpdateThrottleRef = useRef(0);

  const rawCurrent = status?.currentTime ?? 0;
  const rawDuration =
    status?.duration && status.duration > 0
      ? status.duration
      : (trackDuration ?? 0);

  const safeDuration = Number.isFinite(rawDuration)
    ? Math.max(0, rawDuration)
    : 0;
  const syncToSeconds = safeDuration >= 1; // keep progress changes in lockstep with second ticks

  const normalizedCurrent = Number.isFinite(rawCurrent)
    ? Math.max(rawCurrent, 0)
    : 0;
  const durationForDisplay = syncToSeconds
    ? Math.floor(safeDuration)
    : safeDuration;
  const currentForDisplay = syncToSeconds
    ? Math.min(Math.floor(normalizedCurrent), durationForDisplay)
    : Math.min(normalizedCurrent, durationForDisplay);

  const ratioBase = durationForDisplay > 0 ? durationForDisplay : safeDuration;
  const ratio =
    ratioBase > 0 ? Math.min(Math.max(currentForDisplay / ratioBase, 0), 1) : 0;

  const isSeekable = safeDuration > 0;
  const clampSeconds = useCallback(
    (value: number) => {
      if (safeDuration > 0) {
        return Math.min(Math.max(value, 0), safeDuration);
      }
      return Math.max(value, 0);
    },
    [safeDuration]
  );

  const dragSecondsSafe = clampSeconds(dragPreviewSeconds);
  const displaySeconds = isDragging
    ? dragSecondsSafe
    : syncToSeconds
      ? currentForDisplay
      : normalizedCurrent;

  const formattedCurrentTime = formatTime(displaySeconds);
  const formattedDuration = formatTime(
    syncToSeconds ? durationForDisplay : safeDuration
  );
  const effectiveTrackHeight =
    TRACK_HEIGHT *
    (IS_WEB && (isHovering || isDragging) ? TRACK_HOVER_SCALE : 1);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      barWidthShared.value = event.nativeEvent.layout.width;
    },
    [barWidthShared]
  );

  const startDrag = useCallback(
    (seconds: number) => {
      isDraggingRef.current = true;
      dragUpdateThrottleRef.current = Date.now();
      setIsDragging(true);
      setDragPreviewSeconds(clampSeconds(seconds));
    },
    [clampSeconds]
  );

  const updateDragPreview = useCallback(
    (seconds: number) => {
      const now = Date.now();
      if (now - dragUpdateThrottleRef.current > DRAG_TEXT_THROTTLE_MS) {
        dragUpdateThrottleRef.current = now;
        setDragPreviewSeconds(clampSeconds(seconds));
      }
    },
    [clampSeconds]
  );

  const finishDrag = useCallback(
    (seconds: number) => {
      isDraggingRef.current = false;
      setIsDragging(false);
      const nextSeconds = clampSeconds(seconds);
      setDragPreviewSeconds(nextSeconds);
      seekTo(nextSeconds);
    },
    [clampSeconds, seekTo]
  );

  useEffect(() => {
    durationShared.value = safeDuration;
  }, [durationShared, safeDuration]);

  useEffect(() => {
    if (!IS_WEB) {
      return;
    }
    isHoveringShared.value = isHovering ? 1 : 0;
  }, [isHovering, isHoveringShared]);

  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }
    progressRatio.value = withTiming(ratio, {
      duration: syncToSeconds ? 200 : 120
    });
  }, [progressRatio, ratio, syncToSeconds]);

  const fillAnimatedStyle = useAnimatedStyle(() => {
    const width = Math.max(
      0,
      Math.min(barWidthShared.value, barWidthShared.value * progressRatio.value)
    );
    return {
      width
    };
  });

  const handleAnimatedStyle = useAnimatedStyle(() => {
    const barWidth = barWidthShared.value;
    const clampedRatio = Math.min(Math.max(progressRatio.value, 0), 1);
    const translateX = Math.max(
      0,
      Math.min(
        barWidth - HANDLE_SIZE,
        barWidth * clampedRatio - HANDLE_SIZE / 2
      )
    );
    const baseScale = isDraggingShared.value
      ? HANDLE_ACTIVE_SCALE
      : IS_WEB && isHoveringShared.value
        ? HANDLE_HOVER_SCALE
        : 1;
    return {
      transform: [
        { translateX },
        {
          scale: withTiming(baseScale, {
            duration: 120
          })
        }
      ]
    };
  });

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(isSeekable)
      .minDistance(0)
      .onBegin((event) => {
        if (!isSeekable) {
          return;
        }
        const width = barWidthShared.value;
        const durationValue = durationShared.value;
        if (width <= 0 || durationValue <= 0) {
          return;
        }
        const ratioFromPoint = Math.min(Math.max(event.x / width, 0), 1);
        progressRatio.value = ratioFromPoint;
        isDraggingShared.value = 1;
        runOnJS(startDrag)(ratioFromPoint * durationValue);
      })
      .onUpdate((event) => {
        if (!isSeekable) {
          return;
        }
        const width = barWidthShared.value;
        const durationValue = durationShared.value;
        if (width <= 0 || durationValue <= 0) {
          return;
        }
        const ratioFromPoint = Math.min(Math.max(event.x / width, 0), 1);
        progressRatio.value = ratioFromPoint;
        runOnJS(updateDragPreview)(ratioFromPoint * durationValue);
      })
      .onFinalize(() => {
        if (!isSeekable || !isDraggingShared.value) {
          return;
        }
        const durationValue = durationShared.value;
        const ratioValue = Math.min(Math.max(progressRatio.value, 0), 1);
        isDraggingShared.value = 0;
        runOnJS(finishDrag)(ratioValue * durationValue);
      });
  }, [
    barWidthShared,
    durationShared,
    finishDrag,
    isDraggingShared,
    isSeekable,
    progressRatio,
    startDrag,
    updateDragPreview
  ]);

  const progressBar = (
    <GestureDetector gesture={panGesture}>
      <View
        pointerEvents={isSeekable ? 'auto' : 'none'}
        onLayout={handleLayout}
        onMouseEnter={IS_WEB ? () => setIsHovering(true) : undefined}
        onMouseLeave={IS_WEB ? () => setIsHovering(false) : undefined}
        className="w-full justify-center"
        style={{
          height: HANDLE_TOUCH_HEIGHT,
          opacity: isSeekable ? 1 : 0.4,
          cursor: IS_WEB ? (isSeekable ? 'pointer' : 'auto') : undefined
        }}
      >
        <View
          className="w-full overflow-hidden bg-bg-tertiary"
          style={{
            height: effectiveTrackHeight,
            borderRadius: effectiveTrackHeight / 2
          }}
        >
          <Animated.View
            style={[
              {
                height: '100%',
                backgroundColor: themeColors[theme]['primary'],
                borderRadius: effectiveTrackHeight / 2
              },
              fillAnimatedStyle
            ]}
          />
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: (HANDLE_TOUCH_HEIGHT - HANDLE_SIZE) / 2,
              height: HANDLE_SIZE,
              width: HANDLE_SIZE,
              borderRadius: HANDLE_SIZE / 2,
              backgroundColor: IS_WEB
                ? '#FFFFFF'
                : themeColors[theme]['primary'],
              borderWidth: IS_WEB ? 1 : 0,
              borderColor: IS_WEB ? '#B5B5B5' : 'transparent',
              opacity:
                IS_WEB
                  ? isDragging || isHovering
                    ? 1
                    : 0
                  : 1
            },
            handleAnimatedStyle
          ]}
        />
      </View>
    </GestureDetector>
  );

  if (layout === 'inline') {
    return (
      <View className="flex-row items-center gap-2">
        <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
          {formattedCurrentTime}
        </TextCustom>
        <View style={{ flex: 1 }}>{progressBar}</View>
        <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
          {formattedDuration}
        </TextCustom>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row justify-between">
        <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
          {formattedCurrentTime}
        </TextCustom>
        <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
          {formattedDuration}
        </TextCustom>
      </View>
      {progressBar}
    </View>
  );
};

// Memo based only on theme and trackDuration (status updates are handled internally)
const ProgressBar = memo(
  ProgressBarComponent,
  (prev, next) =>
    prev.theme === next.theme &&
    prev.trackDuration === next.trackDuration &&
    prev.layout === next.layout
);
ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;

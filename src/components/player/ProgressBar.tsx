import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useAudioStatus, usePlaybackUI } from '@/providers/PlaybackProvider';
import { themeColors } from '@/style/color-theme';

type ProgressBarProps = {
  theme: keyof typeof themeColors;
  trackDuration?: number; // Fallback duration from track metadata
};

const formatTime = (valueInSeconds: number) => {
  const totalSeconds = Number.isFinite(valueInSeconds)
    ? Math.max(0, Math.floor(valueInSeconds))
    : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const ProgressBarComponent = ({ theme, trackDuration }: ProgressBarProps) => {
  const containerWidthRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scaleX = useRef(new Animated.Value(0)).current; // 0..1 ratio

  // Subscribe to status directly in ProgressBar to avoid parent re-renders
  const { status } = useAudioStatus();
  const { isPlaying } = usePlaybackUI();

  const currentSeconds = status?.currentTime ?? 0;
  const durationSeconds =
    status?.duration && status.duration > 0
      ? status.duration
      : (trackDuration ?? 0);

  // Refs for stable animation control on Android
  const lastReportedSecondsRef = useRef(currentSeconds);
  const durationRef = useRef<number>(0);
  const playingRef = useRef<boolean>(false);

  // const EPSILON_BACKWARD = 0.25; // do not move backward by less than 250ms (kept for possible future use)
  const SEEK_THRESHOLD = 1.5; // consider as seek if jump > 1.5s

  durationRef.current = Number.isFinite(trackDuration ?? 0)
    ? Math.max(
        0,
        status?.duration && status.duration > 0
          ? status.duration
          : (trackDuration ?? 0)
      )
    : 0;
  playingRef.current = isPlaying;

  // Animator helper: start from a given second to the end (or snap if paused)
  const startAnimationFrom = useRef((startSeconds: number) => {
    const width = containerWidthRef.current;
    const duration = durationRef.current;
    const safeDur = Number.isFinite(duration) ? Math.max(0, duration) : 0;

    if (width <= 0 || safeDur <= 0) {
      scaleX.stopAnimation();
      scaleX.setValue(0);
      return;
    }

    const clampedStart = Math.min(Math.max(startSeconds, 0), safeDur);
    const startRatio =
      safeDur > 0 ? Math.min(Math.max(clampedStart / safeDur, 0), 1) : 0;

    scaleX.stopAnimation();
    scaleX.setValue(startRatio);

    if (!playingRef.current) {
      return;
    }

    const remainingSeconds = Math.max(0, safeDur - clampedStart);
    Animated.timing(scaleX, {
      toValue: 1,
      duration: Math.round(remainingSeconds * 1000),
      easing: Easing.linear,
      useNativeDriver: false
    }).start();
  }).current;

  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds)
    : 0;

  // Start/stop animation on play/pause
  useEffect(() => {
    playingRef.current = isPlaying;
    const reported = status?.currentTime ?? 0;
    startAnimationFrom(reported);
  }, [isPlaying, startAnimationFrom, status?.currentTime]);

  // React only to explicit seeks/jumps to avoid jitter
  useEffect(() => {
    const reported = status?.currentTime ?? 0;
    const previous = lastReportedSecondsRef.current;
    lastReportedSecondsRef.current = reported;
    if (Math.abs(reported - previous) > SEEK_THRESHOLD) {
      startAnimationFrom(reported);
    }
  }, [startAnimationFrom, status?.currentTime]);

  const formattedCurrentTime = formatTime(currentSeconds);
  const formattedDuration = formatTime(safeDuration);

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
      <View
        className="h-2 rounded-full bg-bg-tertiary"
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w !== containerWidthRef.current) {
            containerWidthRef.current = w;
            setContainerWidth(w);
            const duration = durationRef.current;
            const safeDur = Number.isFinite(duration)
              ? Math.max(0, duration)
              : 0;
            const current = status?.currentTime ?? 0;
            const ratio =
              safeDur > 0 ? Math.min(Math.max(current / safeDur, 0), 1) : 0;
            scaleX.setValue(ratio);
            // Restart animation from current position after layout change
            startAnimationFrom(current);
          }
        }}
      >
        <Animated.View
          className="h-2 rounded-full"
          style={{
            width: Animated.multiply(scaleX, containerWidth || 1),
            backgroundColor: themeColors[theme]['primary']
          }}
        />
      </View>
    </View>
  );
};

// Memo based only on theme and trackDuration (status updates are handled internally)
const ProgressBar = memo(
  ProgressBarComponent,
  (prev, next) =>
    prev.theme === next.theme && prev.trackDuration === next.trackDuration
);
ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;

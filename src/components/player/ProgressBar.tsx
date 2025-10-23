import { memo, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { usePlaybackStatus } from '@/providers/PlaybackProvider';
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
  const progressBarRef = useRef<View>(null);

  // Subscribe to status directly in ProgressBar to avoid parent re-renders
  const { status } = usePlaybackStatus();

  const currentSeconds = status?.currentTime ?? 0;
  const durationSeconds =
    status?.duration && status.duration > 0
      ? status.duration
      : (trackDuration ?? 0);

  const propsRef = useRef({ currentSeconds, durationSeconds });
  propsRef.current = { currentSeconds, durationSeconds };

  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds)
    : 0;

  useEffect(() => {
    let animationFrameId: number | null = null;

    const updateProgress = () => {
      const { currentSeconds: current, durationSeconds: duration } =
        propsRef.current;

      const safeDur = Number.isFinite(duration) ? Math.max(0, duration) : 0;

      const progressRatio =
        safeDur > 0 ? Math.min(Math.max(current / safeDur, 0), 1) : 0;
      const progressPercent = progressRatio * 100;

      if (progressBarRef.current) {
        // @ts-ignore - setNativeProps exists on native View components
        progressBarRef.current.setNativeProps({
          style: { width: `${progressPercent}%` }
        });
      }

      animationFrameId = requestAnimationFrame(updateProgress);
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

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
      <View className="h-2 rounded-full bg-bg-tertiary">
        <View
          ref={progressBarRef}
          className="h-2 rounded-full"
          style={{
            width: '0%',
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

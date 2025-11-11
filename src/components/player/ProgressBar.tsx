import { memo } from 'react';
import { View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useAudioStatus } from '@/providers/PlaybackProvider';
import { themeColors } from '@/style/color-theme';

type ProgressBarProps = {
  theme: keyof typeof themeColors;
  trackDuration?: number; // Fallback duration from track metadata
  layout?: 'stacked' | 'inline';
};

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

  const rawCurrent = status?.currentTime ?? 0;
  const rawDuration =
    status?.duration && status.duration > 0
      ? status.duration
      : trackDuration ?? 0;

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

  const formattedCurrentTime = formatTime(
    syncToSeconds ? currentForDisplay : normalizedCurrent
  );
  const formattedDuration = formatTime(
    syncToSeconds ? durationForDisplay : safeDuration
  );

  const bar = (
    <View className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
      <View
        style={{
          flexDirection: 'row',
          flex: 1,
          height: '100%'
        }}
      >
        <View
          style={{
            flex: ratio,
            backgroundColor: themeColors[theme]['primary']
          }}
        />
        <View
          style={{
            flex: Math.max(0, 1 - ratio)
          }}
        />
      </View>
    </View>
  );

  if (layout === 'inline') {
    return (
      <View className="flex-row items-center gap-2">
        <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
          {formattedCurrentTime}
        </TextCustom>
        <View style={{ flex: 1 }}>{bar}</View>
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
      {bar}
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

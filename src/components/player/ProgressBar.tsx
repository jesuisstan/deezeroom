import { memo } from 'react';
import { View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { themeColors } from '@/style/color-theme';

type ProgressBarProps = {
  currentSeconds: number;
  durationSeconds: number;
  theme: keyof typeof themeColors;
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
  currentSeconds,
  durationSeconds,
  theme
}: ProgressBarProps) => {
  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(0, durationSeconds)
    : 0;
  const progressRatio =
    safeDuration > 0
      ? Math.min(Math.max(currentSeconds / safeDuration, 0), 1)
      : 0;
  const progressPercent = progressRatio * 100;

  return (
    <View className="gap-3">
      <View className="flex-row justify-between">
        <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
          {formatTime(currentSeconds)}
        </TextCustom>
        <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
          {formatTime(safeDuration)}
        </TextCustom>
      </View>
      <View className="h-2 rounded-full bg-bg-tertiary">
        <View
          className="h-2 rounded-full"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: themeColors[theme]['primary']
          }}
        />
      </View>
    </View>
  );
};

const ProgressBar = memo(ProgressBarComponent);
ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;

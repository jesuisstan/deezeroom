import { FC } from 'react';
import { View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const InfoRow: FC<{
  label: string;
  value?: string | null;
  emptyText?: string;
}> = ({ label, value, emptyText = '—' }) => {
  const isEmpty = !value || !value.trim();
  const { theme } = useTheme();

  return (
    <View className="flex-row items-start justify-between">
      <TextCustom type="semibold" size="m">
        {label}
      </TextCustom>
      {isEmpty ? (
        <TextCustom
          size="s"
          color={themeColors[theme]['text-secondary']}
          className="ml-2 flex-1 text-right"
        >
          {emptyText}
        </TextCustom>
      ) : (
        <TextCustom
          size="s"
          className="ml-2 flex-1 text-right"
          color={themeColors[theme]['primary']}
        >
          {value}
        </TextCustom>
      )}
    </View>
  );
};

export default InfoRow;

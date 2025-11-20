import { FC } from 'react';
import { Pressable } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface TabButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}

const TabButton: FC<TabButtonProps> = ({ label, count, isActive, onPress }) => {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: isActive
          ? themeColors[theme]['primary']
          : 'transparent'
      }}
    >
      <TextCustom
        type={isActive ? 'semibold' : 'default'}
        color={
          isActive
            ? themeColors[theme]['primary']
            : themeColors[theme]['text-secondary']
        }
      >
        {label} ({count})
      </TextCustom>
    </Pressable>
  );
};

export default TabButton;

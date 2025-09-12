import { Pressable, View } from 'react-native';

import clsx from 'clsx';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

type ButtonIconProps = {
  accessibilityLabel: string;
  onPress?: () => void;
  className?: string;
  backgroundColor?: string;
  children: React.ReactNode;
};

const ButtonIcon = ({
  onPress,
  accessibilityLabel,
  className,
  backgroundColor,
  children
}: ButtonIconProps) => {
  const { theme } = useTheme();

  return (
    <View
      className={clsx('h-12 w-12 overflow-hidden rounded-full', className)}
      style={{
        backgroundColor: backgroundColor || themeColors[theme]['transparent']
      }}
    >
      <Pressable
        className="flex-1 items-center justify-center"
        onPress={onPress}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{
          color: themeColors[theme]['border'],
          borderless: false
        }}
      >
        {children}
      </Pressable>
    </View>
  );
};

export default ButtonIcon;

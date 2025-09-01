import { useTheme } from '@/contexts/ThemeProvider';
import { View, type ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  className,
  ...otherProps
}: ThemedViewProps & { className?: string }) {
  const { theme } = useTheme();
  const backgroundColor = theme === 'light' ? lightColor : darkColor;

  return (
    <View
      style={[{ backgroundColor }, style]}
      className={className}
      {...otherProps}
    />
  );
}

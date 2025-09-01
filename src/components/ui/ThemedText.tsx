import { Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  className,
  ...rest
}: ThemedTextProps & { className?: string }) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  const getTypeClasses = () => {
    switch (type) {
      case 'default':
        return 'text-base leading-6';
      case 'title':
        return 'text-3xl leading-8 tracking-widest';
      case 'defaultSemiBold':
        return 'text-base leading-6 font-semibold';
      case 'subtitle':
        return 'text-xl font-italic';
      case 'link':
        return 'leading-8 text-base text-tint-light';
      default:
        return 'text-base leading-6';
    }
  };

  const getFontStyle = () => {
    if (type === 'title' || type === 'subtitle') {
      return { fontFamily: 'LeagueGothic', letterSpacing: 4 };
    }
    return {};
  };

  return (
    <Text
      style={[{ color }, getFontStyle(), style]}
      className={`${getTypeClasses()} ${className || ''}`}
      {...rest}
    />
  );
}

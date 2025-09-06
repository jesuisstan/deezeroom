import { Text, type TextProps } from 'react-native';

import clsx from 'clsx';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

export type TextCustomProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'bold' | 'link' | 'italic';
  color?: string;
};

export function TextCustom({
  type = 'default',
  color,
  ...rest
}: TextCustomProps) {
  const { theme } = useTheme();

  const getTypeClasses = () => {
    switch (type) {
      case 'title':
        return 'text-3xl leading-10 tracking-widest';
      case 'subtitle':
        return 'text-xl leading-6';
      case 'bold':
        return 'text-base leading-6 font-bold';
      case 'link':
        return 'text-base leading-8 underline';
      case 'italic':
        return 'text-base leading-6 font-cursive';
      case 'default':
        return 'text-base leading-6 text-primary';
      default:
        return 'text-base leading-6';
    }
  };

  const getFontStyle = () => {
    if (type === 'title' || type === 'subtitle') {
      return { fontFamily: 'LeagueGothic', letterSpacing: 4 };
    } else {
      return { fontFamily: 'Inter' };
    }
  };

  // Base text color from tailwind (can be overridden via className)
  const defaultTextColorClass =
    type === 'link'
      ? themeColors[theme]['primary']
      : themeColors[theme]['text-main'];
  const customColor = color || defaultTextColorClass;

  return (
    <Text
      style={[getFontStyle(), { color: customColor }]}
      className={clsx(`${getTypeClasses()}`)}
      {...rest}
    />
  );
}

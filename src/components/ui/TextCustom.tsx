import { Text, type TextProps } from 'react-native';

import clsx from 'clsx';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

export type TextCustomProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'bold' | 'link' | 'italic';
  color?: string;
  size?: 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  className?: string;
};

export function TextCustom({
  type = 'default',
  color,
  size,
  className,
  ...rest
}: TextCustomProps) {
  const { theme } = useTheme();

  const getTypeClasses = () => {
    switch (type) {
      case 'title':
        return 'leading-10 tracking-widest';
      case 'subtitle':
        return 'leading-6 tracking-wide';
      case 'bold':
        return 'leading-6 font-bold';
      case 'link':
        return 'leading-8 underline';
      case 'italic':
        return 'leading-6 italic';
      case 'default':
        return 'leading-6';
      default:
        return 'leading-6';
    }
  };

  const getFontStyle = () => {
    if (type === 'title' || type === 'subtitle') {
      return { fontFamily: 'LeagueGothic', letterSpacing: 4 };
    } else {
      return { fontFamily: 'Inter' };
    }
  };

  // Define text color
  const defaultTextColorClass =
    type === 'link'
      ? themeColors[theme]['primary']
      : themeColors[theme]['text-main'];
  const customColor = color || defaultTextColorClass;

  // Define font size
  const getFontSize = () => {
    if (size)
      switch (size) {
        case 'xs':
          return 'text-xs';
        case 's':
          return 'text-s';
        case 'm':
          return 'text-m';
        case 'l':
          return 'text-l';
        case 'xl':
          return 'text-xl';
        case '2xl':
          return 'text-2xl';
        case '3xl':
          return 'text-3xl';
        case '4xl':
          return 'text-4xl';
        case '5xl':
          return 'text-5xl';
        case '6xl':
          return 'text-6xl';
      }
    if (type === 'title') {
      return 'text-3xl';
    } else if (type === 'subtitle') {
      return 'text-xl';
    } else {
      return 'text-base';
    }
  };

  return (
    <Text
      style={[getFontStyle(), { color: customColor }]}
      className={clsx(`${getTypeClasses()}`, getFontSize(), className)}
      {...rest}
    />
  );
}

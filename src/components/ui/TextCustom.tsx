import { Text, type TextProps } from 'react-native';

import clsx from 'clsx';

export type TextCustomProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'bold' | 'link' | 'italic';
};

export function TextCustom({ type = 'default', ...rest }: TextCustomProps) {
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
    type === 'link' ? 'text-primary' : 'text-text-main';

  return (
    <Text
      style={[getFontStyle()]}
      className={clsx(`${getTypeClasses()}`, `${defaultTextColorClass}`)}
      {...rest}
    />
  );
}

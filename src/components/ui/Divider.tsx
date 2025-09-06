import { FC } from 'react';
import { View, ViewProps } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

type DividerProps = ViewProps & {
  orientation?: 'horizontal' | 'vertical';
  inset?: boolean; // margin sides (to make the divider inset, not fill all the width/height of the parent)
  thickness?: number;
};

const Divider: FC<DividerProps> = ({
  orientation = 'horizontal',
  inset = false,
  thickness,
  style,
  ...rest
}) => {
  const { theme } = useTheme();
  const isHorizontal = orientation === 'horizontal';
  // sizeStyle calculated inline in style array

  return (
    <View
      accessibilityRole={undefined}
      className={
        isHorizontal ? `${inset ? 'mx-4' : ''}` : `${inset ? 'my-2' : ''}`
      }
      style={[
        isHorizontal
          ? { alignSelf: 'stretch', height: thickness ?? 1 }
          : { alignSelf: 'stretch', width: thickness ?? 1 },
        { backgroundColor: themeColors[theme]['border'] },
        style
      ]}
      {...rest}
    />
  );
};

export default Divider;

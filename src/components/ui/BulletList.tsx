import { View } from 'react-native';

import clsx from 'clsx';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface BulletListProps {
  items: string[];
  className?: string;
  color?: string;
  size?: 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
}

const BulletList = ({ items, className, color, size }: BulletListProps) => {
  const { theme } = useTheme();

  return (
    <View className={clsx('gap-2', className)}>
      {items.map((item, index) => (
        <View key={index} className="flex-row items-start gap-2">
          <TextCustom
            color={color || themeColors[theme]['text-secondary']}
            size={size}
          >
            {`\u2022`}
          </TextCustom>
          <TextCustom
            color={color || themeColors[theme]['text-secondary']}
            className="flex-1"
            size={size}
          >
            {item}
          </TextCustom>
        </View>
      ))}
    </View>
  );
};

export default BulletList;

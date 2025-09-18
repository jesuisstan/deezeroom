import { View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface BulletListProps {
  items: string[];
  className?: string;
  color?: string;
}

const BulletList = ({ items, className, color }: BulletListProps) => {
  const { theme } = useTheme();

  return (
    <View className={className}>
      {items.map((item, index) => (
        <View key={index} className="flex-row items-start gap-2">
          <TextCustom color={color || themeColors[theme]['text-secondary']}>
            {`\u2022`}
          </TextCustom>
          <TextCustom
            color={color || themeColors[theme]['text-secondary']}
            className="flex-1"
          >
            {item}
          </TextCustom>
        </View>
      ))}
    </View>
  );
};

export default BulletList;

import React from 'react';
import { Pressable, View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface TabButtonProps {
  title: string;
  isActive: boolean;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ title, isActive, onPress }) => {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      className="flex-1"
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1
      })}
    >
      <View
        style={{
          paddingVertical: 10,
          paddingHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'center',
          borderBottomWidth: 2,
          borderBottomColor: isActive
            ? themeColors[theme]['primary']
            : 'transparent'
        }}
      >
        <TextCustom
          type={isActive ? 'bold' : 'default'}
          size="m"
          color={
            isActive
              ? themeColors[theme]['primary']
              : themeColors[theme]['text-secondary']
          }
        >
          {title}
        </TextCustom>
      </View>
    </Pressable>
  );
};

export default TabButton;

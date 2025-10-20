import React from 'react';
import { Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { usePressAnimation } from '@/style/usePressAnimation';

interface FeatureTileProps {
  onPress: () => void;
  icon: string;
  title: string;
  description: string;
  backgroundColor: string;
}

const FeatureTile: React.FC<FeatureTileProps> = ({
  onPress,
  icon,
  title,
  description,
  backgroundColor
}) => {
  const { theme } = useTheme();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={null}
        style={{
          height: 120,
          backgroundColor,
          borderRadius: 4,
          padding: 16,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: themeColors[theme]['bg-inverse'],
          shadowOffset: {
            width: 0,
            height: 4
          },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          //elevation: 4,
          overflow: 'hidden'
        }}
      >
        <View className="items-center gap-2">
          <MaterialCommunityIcons
            name={icon as any}
            size={32}
            color={themeColors[theme]['text-inverse']}
          />
          <TextCustom
            type="bold"
            size="m"
            color={themeColors[theme]['text-main']}
            className="text-center"
            selectable={false}
          >
            {title}
          </TextCustom>
          <TextCustom
            size="xs"
            color={themeColors[theme]['text-main']}
            className="text-center"
            selectable={false}
          >
            {description}
          </TextCustom>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default FeatureTile;

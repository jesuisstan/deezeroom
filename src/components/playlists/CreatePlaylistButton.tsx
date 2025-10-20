import React from 'react';
import { Dimensions, Pressable } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { usePressAnimation } from '@/style/usePressAnimation';

const CreatePlaylistCard = ({ onPress }: { onPress: () => void }) => {
  const { theme } = useTheme();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

  const { width } = Dimensions.get('window');
  //const cardWidth = Math.min((width - 48) / 2, 200);
  const cardWidth = Math.min((width - 72) / 2, 200); // For web compatibility

  return (
    <Animated.View style={animatedStyle || {}}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={null}
        style={{
          width: cardWidth,
          height: cardWidth,
          backgroundColor: themeColors[theme]['bg-secondary'],
          borderRadius: 4,
          padding: 12,
          borderWidth: 2,
          borderColor: themeColors[theme]['border'],
          borderStyle: 'dashed',
          shadowColor: themeColors[theme]['bg-inverse'],
          shadowOffset: {
            width: 0,
            height: 2
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}
      >
        <MaterialCommunityIcons
          name="plus"
          size={42}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom
          type="title"
          size="xl"
          color={themeColors[theme]['text-secondary']}
          className="text-center"
          selectable={false}
        >
          Create New
        </TextCustom>
      </Pressable>
    </Animated.View>
  );
};

export default CreatePlaylistCard;

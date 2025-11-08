import React from 'react';
import { Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface CreateEventButtonProps {
  onPress: () => void;
}

const CreateEventButton: React.FC<CreateEventButtonProps> = ({ onPress }) => {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} style={{ width: '100%', marginBottom: 12 }}>
      <View
        style={{
          borderWidth: 2,
          borderRadius: 8,
          padding: 16,
          borderStyle: 'dashed',
          borderColor: themeColors[theme]['border'],
          backgroundColor: themeColors[theme]['bg-secondary'],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12
        }}
      >
        <MaterialCommunityIcons
          name="calendar-plus"
          size={22}
          color={themeColors[theme]['primary']}
        />
        <TextCustom
          type="semibold"
          size="m"
          color={themeColors[theme]['text-main']}
        >
          Create new event
        </TextCustom>
      </View>
    </Pressable>
  );
};

export default CreateEventButton;

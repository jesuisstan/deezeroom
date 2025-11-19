import React from 'react';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import RippleButton from '@/components/ui/buttons/RippleButton';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface CreateEventButtonProps {
  onPress: () => void;
}

const CreateEventButton: React.FC<CreateEventButtonProps> = ({ onPress }) => {
  const { theme } = useTheme();

  return (
    <RippleButton
      variant="outline"
      size="lg"
      onPress={onPress}
      title="Create new event"
      leftIcon={
        <MaterialCommunityIcons
          name="calendar-plus"
          size={22}
          color={themeColors[theme]['primary']}
        />
      }
    />
  );
};

export default CreateEventButton;

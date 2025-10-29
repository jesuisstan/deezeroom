import { memo } from 'react';
import { View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import LineButton from '@/components/ui/buttons/LineButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface AddTrackButtonProps {
  onPress: () => void;
}

const AddTracksButton: React.FC<AddTrackButtonProps> = ({ onPress }) => {
  const { theme } = useTheme();

  return (
    <LineButton onPress={onPress}>
      <View className="flex-1 flex-row items-center justify-start gap-4 px-4 py-2">
        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded border border-dashed border-border bg-bg-secondary">
          <MaterialCommunityIcons
            name="music-note-plus"
            size={24}
            color={themeColors[theme]['text-main']}
          />
        </View>
        <TextCustom
          type="semibold"
          size="m"
          color={themeColors[theme]['text-main']}
        >
          Add tracks
        </TextCustom>
      </View>
    </LineButton>
  );
};

export default memo(AddTracksButton);

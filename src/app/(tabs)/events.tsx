import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';

const EventsScreen = () => {
  const { theme } = useTheme();
  const { currentTrack } = usePlaybackState();

  // Add padding when mini player is visible
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: bottomPadding
      }}
      className="bg-bg-main"
    >
      <View style={containerWidthStyle}>
        <TextCustom color={themeColors[theme]['primary']} type="subtitle">
          Events
        </TextCustom>
        <TextCustom className="animate-pulse text-center">
          To be implemented soon...
        </TextCustom>

        <Divider />
      </View>
    </ScrollView>
  );
};

export default EventsScreen;

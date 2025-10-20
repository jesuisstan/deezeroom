import { ScrollView, View } from 'react-native';

import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';

const EventsScreen = () => {
  const { theme } = useTheme();

  return (
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{ flexGrow: 1 }}
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

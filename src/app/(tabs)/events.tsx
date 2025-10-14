import { ScrollView, View } from 'react-native';

import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const EventsScreen = () => {
  const { theme } = useTheme();

  return (
    <ScrollView
      //className="flex-1 bg-bg-main"
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: themeColors[theme]['bg-main'],
        flexDirection: 'column',
        alignSelf: 'center'
      }}
    >
      <View className="w-full flex-1 gap-4">
        <TextCustom type="subtitle">Events</TextCustom>
        <TextCustom className="animate-pulse text-center">
          To be implemented soon...
        </TextCustom>

        <Divider />
      </View>
    </ScrollView>
  );
};

export default EventsScreen;

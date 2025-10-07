import { ScrollView, View } from 'react-native';

import clsx from 'clsx';

import ApiTestComponent from '@/components/ApiTestComponent';
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
        backgroundColor:
          theme === 'dark'
            ? themeColors.dark['bg-main']
            : themeColors.light['bg-main'],
        flexDirection: 'column',
        alignSelf: 'center'
      }}
    >
      <TextCustom type="subtitle">API Test</TextCustom>
      <View className={clsx('flex-1 gap-4 p-4', 'bg-bg-secondary')}>
        <ApiTestComponent />
      </View>
    </ScrollView>
  );
};

export default EventsScreen;

import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const ActivityIndicatorScreen = () => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          theme === 'dark'
            ? themeColors.dark['bg-main']
            : themeColors.light['bg-main']
      }}
    >
      <ActivityIndicator size="large" color={themeColors.light.accent} />
    </View>
  );
};

export default ActivityIndicatorScreen;

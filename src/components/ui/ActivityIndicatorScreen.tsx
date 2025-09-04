import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

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
            ? themeColors.dark.background
            : themeColors.light.background
      }}
    >
      <ActivityIndicator size="large" color={themeColors.light.accent} />
    </View>
  );
};

export default ActivityIndicatorScreen;

import { ActivityIndicator, View } from 'react-native';

import { themeColors } from '@/utils/color-theme';

const ActivityIndicatorScreen = () => {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={themeColors.light.accent} />
    </View>
  );
};

export default ActivityIndicatorScreen;

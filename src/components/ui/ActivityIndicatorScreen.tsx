import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';

const ActivityIndicatorScreen = () => {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={Colors.light.accentMain} />
    </View>
  );
};

export default ActivityIndicatorScreen;

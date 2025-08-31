import { View, StyleSheet } from 'react-native';
import UserProfileScreen from '@/components/UserProfile';
import { Colors } from '@/constants/Colors';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <UserProfileScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background
  }
});

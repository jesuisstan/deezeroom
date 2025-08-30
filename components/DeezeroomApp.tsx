import 'react-native-reanimated';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Stack } from 'expo-router';

import { useUser } from '@/contexts/UserContext';
//import { useNetwork } from '@/contexts/NetworkContext';
//import shootAlert from '@/utils/shoot-alert';
import { Colors } from '@/constants/Colors';
import LoginScreen from '@/components/LoginScreen';

const DeezeroomApp = () => {
  const { user } = useUser();

  //const { isConnected } = useNetwork();
  //useEffect(() => {
  //  if (!isConnected) {
  //    shootAlert('Network Error!', 'Please check your internet connection.');
  //  }
  //}, [isConnected]);

  return (
    <View style={styles.container}>
      <StatusBar
        animated={true}
        backgroundColor={Colors.light.accentMain}
        barStyle="dark-content"
        showHideTransition="slide"
        hidden={false}
      />
      {!user ? (
        <LoginScreen />
      ) : (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative'
  }
});

export default DeezeroomApp;

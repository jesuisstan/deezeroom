import { StyleSheet, View } from 'react-native';

import { Link, Stack } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <TextCustom type="title">This screen doesn't exist.</TextCustom>
        <Link href="/" style={styles.link}>
          <TextCustom type="link">Go to home screen!</TextCustom>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  link: {
    marginTop: 15,
    paddingVertical: 15
  }
});

import { StyleSheet, Pressable, TextInput, Image } from 'react-native';
import { useState } from 'react';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const [name, setName] = useState('');

  const fetchGreeting = async () => {
    const response = await fetch('/api/greeting');
    const data = await response.json();
    alert(data.greeting);
  };

  const postGreeting = async () => {
    const response = await fetch(
      `/api/greeting?name=${encodeURIComponent(name)}`,
      { method: 'POST' }
    );
    const data = await response.json();
    alert(data.greeting);
  };

  const postGraphql = async () => {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '{ greeting }'
      })
    });
    const data = await response.json();

    alert(data.data.greeting);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1D6B2', dark: '#1E3A34' }}
      headerImage={
        <Image
          source={require('@/assets/images/logo/deezeroom-black-transparent.png')}
          style={styles.logo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">deezeroom app</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Open an API route</ThemedText>
        <Pressable onPress={fetchGreeting}>
          <ThemedText style={{ textDecorationLine: 'underline' }}>
            GET /api/greeting
          </ThemedText>
        </Pressable>
        <ThemedView style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />
          <Pressable onPress={postGreeting}>
            <ThemedText style={{ textDecorationLine: 'underline' }}>
              POST /api/greeting
            </ThemedText>
          </Pressable>
        </ThemedView>
        <Pressable onPress={postGraphql}>
          <ThemedText style={{ textDecorationLine: 'underline' }}>
            POST /api/graphql
          </ThemedText>
        </Pressable>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Inspect environment variables</ThemedText>
        <ThemedText>MY_VALUE: {process.env.MY_VALUE}</ThemedText>
        <ThemedText>
          EXPO_PUBLIC_VALUE: {process.env.EXPO_PUBLIC_VALUE}
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    flex: 1
  },
  logo: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    resizeMode: 'contain',
    bottom: 10,
    left: -200
  }
});

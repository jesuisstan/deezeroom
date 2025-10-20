import { Stack } from 'expo-router';

const PlaylistsLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          headerShown: false
        }}
      />
    </Stack>
  );
};

export default PlaylistsLayout;

import { View } from 'react-native';

import { Stack } from 'expo-router';

import PlaylistHeaderTitle from '@/components/playlists/PlaylistHeaderTitle';
import RouterBackButton from '@/components/ui/buttons/RouterBackButton';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const PlaylistsLayout = () => {
  const { theme } = useTheme();
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
          headerShown: true,
          header: () => (
            <View
              style={{
                backgroundColor: themeColors[theme].primary,
                height: 46,
                justifyContent: 'center',
                borderBottomWidth: 1,
                borderBottomColor: themeColors[theme].border
              }}
            >
              <View style={{ position: 'absolute', left: 8, zIndex: 1000 }}>
                <RouterBackButton />
              </View>
              <View style={{ alignItems: 'center' }}>
                <PlaylistHeaderTitle />
              </View>
            </View>
          )
        }}
      />
    </Stack>
  );
};

export default PlaylistsLayout;

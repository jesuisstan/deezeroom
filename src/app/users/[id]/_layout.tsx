import { Stack } from 'expo-router';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const UserProfileLayout = () => {
  const { theme } = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Deezeroom User',
          headerShown: true,
          headerStyle: {
            backgroundColor: themeColors[theme]['primary']
          },
          headerTintColor: themeColors[theme]['text-main'],
          headerTitleStyle: {
            fontFamily: 'LeagueGothic',
            fontSize: 30
          }
        }}
      />
    </Stack>
  );
};

export default UserProfileLayout;

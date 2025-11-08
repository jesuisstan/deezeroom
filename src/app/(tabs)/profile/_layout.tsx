import { FC } from 'react';
import { View } from 'react-native';

import { Stack } from 'expo-router';

import RouterBackButton from '@/components/ui/buttons/RouterBackButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const ProfileLayout = () => {
  const { theme } = useTheme();

  const CustomHeader: FC<{ title: string }> = ({ title }) => {
    return (
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
          <TextCustom type="subtitle">{title}</TextCustom>
        </View>
      </View>
    );
  };

  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          //title: 'Profile',
          headerShown: false
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: 'Profile',
          headerShown: true,
          header: () => <CustomHeader title="" />
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Profile Settings',
          headerShown: true,
          header: () => <CustomHeader title="Profile Settings" />
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: 'Edit Profile',
          headerShown: true,
          header: () => <CustomHeader title="Edit Profile" />
        }}
      />
    </Stack>
  );
};

export default ProfileLayout;

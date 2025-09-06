import { Pressable, View } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';

import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/utils/color-theme';

const SignOutButton = () => {
  const { signOut } = useUser();
  const { theme } = useTheme();

  return (
    <View className="h-12 w-12 overflow-hidden rounded-full bg-bg-main">
      <Pressable
        className="flex-1 items-center justify-center"
        onPress={signOut}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        android_ripple={{
          color: themeColors[theme]['border'],
          borderless: false
        }}
      >
        <AntDesign
          name="logout"
          size={22}
          color={themeColors[theme]['text-main']}
        />
      </Pressable>
    </View>
  );
};

export default SignOutButton;

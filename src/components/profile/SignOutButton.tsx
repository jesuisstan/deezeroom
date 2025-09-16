import AntDesign from '@expo/vector-icons/AntDesign';

import IconButton from '@/components/ui/buttons/IconButton';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';

const SignOutButton = () => {
  const { signOut } = useUser();
  const { theme } = useTheme();

  return (
    <IconButton accessibilityLabel="Sign out" onPress={signOut}>
      <AntDesign
        name="logout"
        size={22}
        color={themeColors[theme]['text-main']}
      />
    </IconButton>
  );
};

export default SignOutButton;

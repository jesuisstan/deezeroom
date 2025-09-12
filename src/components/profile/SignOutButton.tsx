import AntDesign from '@expo/vector-icons/AntDesign';

import ButtonIcon from '@/components/ui/ButtonIcon';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';

const SignOutButton = () => {
  const { signOut } = useUser();
  const { theme } = useTheme();

  return (
    <ButtonIcon accessibilityLabel="Sign out" onPress={signOut}>
      <AntDesign
        name="logout"
        size={22}
        color={themeColors[theme]['text-main']}
      />
    </ButtonIcon>
  );
};

export default SignOutButton;

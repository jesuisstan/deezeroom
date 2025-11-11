import AntDesign from '@expo/vector-icons/AntDesign';

import { Alert } from '@/components/modules/alert';
import IconButton from '@/components/ui/buttons/IconButton';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';

const SignOutButton = () => {
  const { signOut } = useUser();
  const { theme } = useTheme();

  const handleSignOut = () => {
    Alert.confirm(
      'Sign out',
      'Are you sure you want to sign out?',
      () => {
        // Confirmed - execute sign out
        signOut();
      }
      // Cancelled - do nothing
    );
  };

  return (
    <IconButton accessibilityLabel="Sign out" onPress={handleSignOut}>
      <AntDesign
        name="logout"
        size={22}
        color={themeColors[theme]['text-main']}
      />
    </IconButton>
  );
};

export default SignOutButton;

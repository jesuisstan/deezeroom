import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import IconButton from '@/components/ui/buttons/IconButton';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const NotificationsButton = () => {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <IconButton
      accessibilityLabel="Open notifications"
      onPress={() => router.push('/notifications')}
    >
      <MaterialCommunityIcons
        name="bell-outline"
        size={22}
        color={themeColors[theme]['text-main']}
      />
    </IconButton>
  );
};

export default NotificationsButton;

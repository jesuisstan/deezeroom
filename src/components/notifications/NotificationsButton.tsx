import React from 'react';
import { View } from 'react-native';

import Fontisto from '@expo/vector-icons/Fontisto';
import { useRouter } from 'expo-router';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useNotifications } from '@/providers/NotificationsProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const NotificationsButton = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { badgeCount } = useNotifications();

  return (
    <View style={{ position: 'relative' }}>
      <IconButton
        accessibilityLabel="Open notifications"
        onPress={() => router.push('/notifications')}
      >
        <Fontisto
          name={badgeCount > 0 ? 'bell-alt' : 'bell'}
          size={22}
          color={themeColors[theme]['text-main']}
        />
      </IconButton>

      {/* Badge for unread notifications */}
      {badgeCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            backgroundColor: themeColors[theme]['primary'] + '50',
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 4
          }}
        >
          <TextCustom
            type="semibold"
            size="xs"
            color={themeColors[theme]['text-main']}
          >
            {badgeCount > 99 ? '99+' : badgeCount.toString()}
          </TextCustom>
        </View>
      )}
    </View>
  );
};

export default NotificationsButton;

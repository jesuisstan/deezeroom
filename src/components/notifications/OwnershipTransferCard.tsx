import React from 'react';
import { View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { OwnershipTransferNotification } from '@/utils/firebase/firebase-service-playlists';

interface OwnershipTransferCardProps {
  notification: OwnershipTransferNotification;
  animatedStyle: any;
  processingNotifications: Set<string>;
  onMarkRead: (id: string) => Promise<void>;
  onNavigateToPlaylists: (playlistId: string, id: string) => Promise<void>;
}

const OwnershipTransferCard: React.FC<OwnershipTransferCardProps> = ({
  notification,
  animatedStyle,
  processingNotifications,
  onMarkRead,
  onNavigateToPlaylists
}) => {
  const { theme } = useTheme();
  const isProcessing = processingNotifications.has(notification.id);

  const handleMarkRead = async () => {
    await onMarkRead(notification.id);
  };

  const handleNavigateToPlaylists = async () => {
    await onNavigateToPlaylists(notification.playlistId, notification.id);
  };

  return (
    <Animated.View style={animatedStyle}>
      <View className="gap-2 rounded-md border border-border bg-bg-secondary px-4 py-3">
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="crown"
            size={18}
            color={themeColors[theme]['primary']}
            style={{ marginRight: 8 }}
          />
          <TextCustom
            type="semibold"
            size="m"
            color={themeColors[theme]['text-main']}
          >
            Ownership Transferred
          </TextCustom>
        </View>

        <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
          You are now the owner of "{notification.playlistName}" playlist.
        </TextCustom>

        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <RippleButton
              title="Mark read"
              size="sm"
              variant="outline"
              loading={isProcessing}
              disabled={isProcessing}
              onPress={handleMarkRead}
              width="full"
            />
          </View>
          <View className="flex-1">
            <RippleButton
              title="To playlists"
              size="sm"
              loading={isProcessing}
              disabled={isProcessing}
              onPress={handleNavigateToPlaylists}
              width="full"
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export default OwnershipTransferCard;

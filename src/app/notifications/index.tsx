import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { usePlaylistInvitations } from '@/hooks/usePlaylistInvitations';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import { PlaylistInvitation } from '@/utils/firebase/firebase-service-playlists';
import { parseFirestoreDate } from '@/utils/firebase/firestore-date-utils';

const NotificationsScreen = () => {
  const { theme } = useTheme();
  const {
    playlistInvitations,
    unreadCount,
    isLoading,
    refreshInvitations,
    acceptInvitation,
    declineInvitation
  } = usePlaylistInvitations();

  const [processingInvitations, setProcessingInvitations] = useState<
    Set<string>
  >(new Set());
  // (Friend request state removed - unused placeholders cleaned up)

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await refreshInvitations();
  };

  const sortedInvitations = useMemo(() => {
    return [...playlistInvitations].sort((a, b) => {
      const dateA = parseFirestoreDate(a.invitedAt).getTime();
      const dateB = parseFirestoreDate(b.invitedAt).getTime();
      return dateB - dateA;
    });
  }, [playlistInvitations]);

  const handleAcceptInvitation = async (invitation: PlaylistInvitation) => {
    setProcessingInvitations((prev) => new Set(prev).add(invitation.id));
    try {
      const result = await acceptInvitation(invitation);
      if (!result.success) {
        throw new Error(result.message || 'Failed to accept invitation');
      }
    } catch (error) {
      Logger.error('Error accepting invitation:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to accept invitation'
      });
    } finally {
      setProcessingInvitations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  const handleDeclineInvitation = async (invitation: PlaylistInvitation) => {
    setProcessingInvitations((prev) => new Set(prev).add(invitation.id));
    try {
      const result = await declineInvitation(invitation);
      if (!result.success) {
        throw new Error(result.message || 'Failed to decline invitation');
      }
    } catch (error) {
      Logger.error('Error declining invitation:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to decline invitation'
      });
    } finally {
      setProcessingInvitations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invitation.id);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (sortedInvitations.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: themeColors[theme]['bg-main'] }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[themeColors[theme]['primary']]}
            tintColor={themeColors[theme]['primary']}
          />
        }
      >
        <View
          className="flex-1 items-center justify-center p-8"
          style={containerWidthStyle}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={64}
            color={themeColors[theme]['text-secondary']}
          />
          <TextCustom
            type="bold"
            size="xl"
            className="mt-4 text-center"
            color={themeColors[theme]['text-main']}
          >
            No Notifications
          </TextCustom>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 p-3"
      style={{ backgroundColor: themeColors[theme]['bg-main'] }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          colors={[themeColors[theme]['primary']]}
          tintColor={themeColors[theme]['primary']}
        />
      }
    >
      <View style={containerWidthStyle}>
        <View className="mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <TextCustom size="xs" color={themeColors[theme]['text-main']}>
                {sortedInvitations.length} playlist invitation(s)
                {unreadCount > 0 ? ` • ${unreadCount} new` : ''}
              </TextCustom>
            </View>
          </View>
        </View>

        {sortedInvitations.map((invitation) => (
          <View
            key={invitation.id}
            className="mb-2 rounded-md border px-4 py-3"
            style={{
              backgroundColor: themeColors[theme]['bg-secondary'],
              borderColor: themeColors[theme]['border']
            }}
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="playlist-music"
                size={18}
                color={themeColors[theme]['primary']}
                style={{ marginRight: 8 }}
              />
              <TextCustom
                type="semibold"
                size="s"
                color={themeColors[theme]['text-main']}
              >
                Playlist Invitation
              </TextCustom>
            </View>

            <TextCustom
              size="s"
              color={themeColors[theme]['text-secondary']}
              className="mt-1"
            >
              {`You've been invited to collaborate on "${invitation.playlistName || 'a playlist'}".`}
            </TextCustom>

            {/* Action buttons */}
            <View className="mt-3 flex-row items-center gap-2">
              <View className="flex-1">
                <RippleButton
                  title="Accept"
                  size="sm"
                  loading={processingInvitations.has(invitation.id)}
                  disabled={processingInvitations.has(invitation.id)}
                  onPress={() => handleAcceptInvitation(invitation)}
                  width="full"
                />
              </View>
              <View className="flex-1">
                <RippleButton
                  title="Decline"
                  size="sm"
                  variant="outline"
                  loading={processingInvitations.has(invitation.id)}
                  disabled={processingInvitations.has(invitation.id)}
                  onPress={() => handleDeclineInvitation(invitation)}
                  width="full"
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default NotificationsScreen;

import React, { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useInvitations } from '@/hooks/useInvitations';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import { PlaylistInvitation } from '@/utils/firebase/firebase-service-playlists';

const NotificationsScreen = () => {
  const { theme } = useTheme();
  const {
    invitations,
    unreadCount,
    isLoading,
    refreshInvitations,
    markAsRead,
    acceptInvitation,
    declineInvitation
  } = useInvitations();

  const [processingInvitations, setProcessingInvitations] = useState<
    Set<string>
  >(new Set());

  // Mark notifications as read only when user actively interacts with the screen
  const handleRefresh = async () => {
    await refreshInvitations();
    // Mark as read when user actively refreshes
    if (unreadCount > 0) {
      markAsRead();
    }
  };

  const handleAcceptInvitation = async (invitation: PlaylistInvitation) => {
    setProcessingInvitations((prev) => new Set(prev).add(invitation.id));
    try {
      await acceptInvitation(invitation);
      Notifier.shoot({
        type: 'success',
        title: 'Success',
        message: 'Invitation accepted'
      });
    } catch (error) {
      Logger.error(String(error));
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
      await declineInvitation(invitation);
      Notifier.shoot({
        type: 'warn',
        title: 'Warning',
        message: 'Invitation declined'
      });
    } catch (error) {
      Logger.error(String(error));
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

  if (invitations.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: themeColors[theme]['bg-main'] }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
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
            type="subtitle"
            className="mt-4 text-center"
            color={themeColors[theme]['primary']}
          >
            No Notifications
          </TextCustom>
          <TextCustom
            className="mt-2 text-center opacity-70"
            color={themeColors[theme]['text-secondary']}
          >
            You don't have any pending invitations
          </TextCustom>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 p-4"
      style={{ backgroundColor: themeColors[theme]['bg-main'] }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      <View style={containerWidthStyle}>
        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <TextCustom type="subtitle" className="mb-2">
                Invitations
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                {invitations.length} pending invitation(s)
                {unreadCount > 0 && ` • ${unreadCount} new`}
              </TextCustom>
            </View>

            {unreadCount > 0 && (
              <RippleButton
                title="Mark all read"
                size="sm"
                variant="outline"
                onPress={markAsRead}
                className="px-3"
              />
            )}
          </View>
        </View>

        {invitations.map((invitation) => (
          <View
            key={invitation.id}
            className="mb-4 rounded-xl border p-4"
            style={{
              backgroundColor: themeColors[theme]['bg-secondary'],
              borderColor: themeColors[theme]['border']
            }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="mb-2 flex-row items-center">
                  <MaterialCommunityIcons
                    name="playlist-music"
                    size={20}
                    color={themeColors[theme]['primary']}
                    style={{ marginRight: 8 }}
                  />
                  <TextCustom type="subtitle">Playlist Invitation</TextCustom>
                </View>

                {invitation.playlistName && (
                  <TextCustom
                    type="subtitle"
                    color={themeColors[theme]['primary']}
                    className="mb-2"
                    numberOfLines={2}
                  >
                    "{invitation.playlistName}"
                  </TextCustom>
                )}

                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                  className="mb-2"
                >
                  You've been invited to collaborate on
                  {invitation.playlistName ? ' this playlist' : ' a playlist'}
                </TextCustom>

                <TextCustom
                  size="xs"
                  color={themeColors[theme]['text-secondary']}
                >
                  Invited by:{' '}
                  <TextCustom
                    size="xs"
                    color={themeColors[theme]['primary']}
                    style={{ fontWeight: '500' }}
                  >
                    {invitation.displayName || invitation.email || 'Unknown'}
                  </TextCustom>
                </TextCustom>
              </View>

              <MaterialCommunityIcons
                name="account-plus"
                size={28}
                color={themeColors[theme]['primary']}
              />
            </View>

            <View className="mt-4 flex-row gap-2">
              <RippleButton
                title="Accept"
                size="sm"
                loading={processingInvitations.has(invitation.id)}
                disabled={processingInvitations.has(invitation.id)}
                onPress={() => handleAcceptInvitation(invitation)}
                className="flex-1"
              />
              <RippleButton
                title="Decline"
                size="sm"
                variant="outline"
                loading={processingInvitations.has(invitation.id)}
                disabled={processingInvitations.has(invitation.id)}
                onPress={() => handleDeclineInvitation(invitation)}
                className="flex-1"
              />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default NotificationsScreen;

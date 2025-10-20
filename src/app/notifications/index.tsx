import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import {
  PlaylistInvitation,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';

const NotificationsScreen = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const [invitations, setInvitations] = useState<PlaylistInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInvitations = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const userInvitations = await PlaylistService.getUserInvitations(
        user.uid
      );
      setInvitations(userInvitations);
    } catch (error) {
      Logger.error('Error loading invitations:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to load invitations'
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInvitations();
    setIsRefreshing(false);
  }, [loadInvitations]);

  const handleAcceptInvitation = async (invitation: PlaylistInvitation) => {
    if (!user) return;

    try {
      const result = await PlaylistService.acceptInvitation(
        invitation.playlistId,
        invitation.id,
        user.uid
      );

      if (result.success) {
        Notifier.shoot({
          type: 'success',
          title: 'Success',
          message: result.message || 'Invitation accepted!'
        });
        await loadInvitations(); // Reload invitations
      } else {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: result.message || 'Failed to accept invitation'
        });
      }
    } catch (error) {
      Logger.error('Error accepting invitation:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to accept invitation'
      });
    }
  };

  const handleDeclineInvitation = async (invitation: PlaylistInvitation) => {
    if (!user) return;

    try {
      const result = await PlaylistService.declineInvitation(
        invitation.playlistId,
        invitation.id,
        user.uid
      );

      if (result.success) {
        Notifier.shoot({
          type: 'success',
          title: 'Success',
          message: result.message || 'Invitation declined'
        });
        await loadInvitations(); // Reload invitations
      } else {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: result.message || 'Failed to decline invitation'
        });
      }
    } catch (error) {
      Logger.error('Error declining invitation:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to decline invitation'
      });
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  if (isLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (invitations.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: themeColors[theme]['bg-main'] }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="flex-1 items-center justify-center p-8">
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
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="mb-4">
        <TextCustom type="subtitle" className="mb-2">
          Invitations
        </TextCustom>
        <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
          {invitations.length} pending invitation(s)
        </TextCustom>
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
              <TextCustom type="subtitle" className="mb-1">
                Playlist Invitation
              </TextCustom>
              <TextCustom
                size="s"
                color={themeColors[theme]['text-secondary']}
                className="mb-2"
              >
                You've been invited to join a playlist
              </TextCustom>
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                Invited by:{' '}
                {invitation.displayName || invitation.email || 'Unknown'}
              </TextCustom>
            </View>

            <MaterialCommunityIcons
              name="account-plus"
              size={24}
              color={themeColors[theme]['primary']}
            />
          </View>

          <View className="mt-4 flex-row gap-2">
            <RippleButton
              title="Accept"
              size="sm"
              onPress={() => handleAcceptInvitation(invitation)}
              className="flex-1"
            />
            <RippleButton
              title="Decline"
              size="sm"
              variant="outline"
              onPress={() => handleDeclineInvitation(invitation)}
              className="flex-1"
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

export default NotificationsScreen;

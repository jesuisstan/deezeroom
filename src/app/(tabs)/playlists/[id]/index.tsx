import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import UserInviteComponent from '@/components/playlists/UserInviteComponent';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import {
  Playlist,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';
import { UserProfile } from '@/utils/firebase/firebase-service-user';

const PlaylistDetailScreen = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadPlaylist = useCallback(async () => {
    if (!id || !user) return;

    try {
      setIsLoading(true);
      setError(null);

      const playlistData = await PlaylistService.getPlaylist(id);

      if (!playlistData) {
        setError('Playlist not found');
        return;
      }

      // Check if user has access to this playlist
      const hasAccess =
        playlistData.visibility === 'public' ||
        playlistData.createdBy === user.uid ||
        playlistData.participants.some((p) => p.userId === user.uid);

      if (!hasAccess) {
        setError('You do not have access to this playlist');
        return;
      }

      setPlaylist(playlistData);
    } catch (error) {
      Logger.error('Error loading playlist:', error);
      setError('Failed to load playlist');
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to load playlist'
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadPlaylist();
  }, [id, user, loadPlaylist]);

  const handleBack = () => {
    router.back();
  };

  const handleDeletePlaylist = () => {
    if (!playlist || !user) return;

    Alert.delete(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
      async () => {
        try {
          await PlaylistService.deletePlaylist(playlist.id);

          Notifier.shoot({
            type: 'warn',
            title: 'Success',
            message: 'Playlist deleted successfully'
          });

          // Navigate back to playlists and force refresh
          router.replace('/(tabs)/playlists');
        } catch (error) {
          Logger.error('Error deleting playlist:', error);
          Notifier.shoot({
            type: 'error',
            title: 'Error',
            message: 'Failed to delete playlist'
          });
        }
      }
    );
  };

  const handleEditPlaylist = () => {
    // TODO: Implement edit playlist functionality
    Notifier.shoot({
      type: 'info',
      title: 'Coming Soon',
      message: 'Edit playlist functionality will be available soon'
    });
  };

  const handleInviteUsers = () => {
    if (!playlist || !user) return;

    // Check if user can invite
    const canInvite =
      playlist.createdBy === user.uid ||
      playlist.participants.some(
        (p) => p.userId === user.uid && p.role === 'editor'
      );

    if (!canInvite) {
      Notifier.shoot({
        type: 'error',
        title: 'Permission Denied',
        message: 'You do not have permission to invite users to this playlist'
      });
      return;
    }

    setShowInviteModal(true);
  };

  const handleSendInvitations = async (selectedUsers: UserProfile[]) => {
    if (!playlist || !user || selectedUsers.length === 0) return;

    try {
      const invitationResult =
        await PlaylistService.inviteMultipleUsersToPlaylist(
          playlist.id,
          selectedUsers.map((user) => ({
            userId: user.uid,
            displayName: user.displayName,
            email: user.email
          })),
          user.uid
        );

      if (invitationResult.success && invitationResult.invitedCount > 0) {
        Notifier.shoot({
          type: 'success',
          title: 'Invitations Sent',
          message: `${invitationResult.invitedCount} invitation(s) sent successfully!`
        });

        // Show warnings for any errors
        if (invitationResult.errors.length > 0) {
          Notifier.shoot({
            type: 'warn',
            title: 'Some invitations failed',
            message: invitationResult.errors.join(', ')
          });
        }

        // Reload playlist to get updated participants
        await loadPlaylist();
      } else {
        Notifier.shoot({
          type: 'error',
          title: 'Failed to Send Invitations',
          message:
            invitationResult.errors.join(', ') || 'No invitations were sent'
        });
      }
    } catch (error) {
      Logger.error('Error sending invitations:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to send invitations'
      });
      throw error; // Re-throw to let UserInviteModal handle loading state
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
  };

  if (isLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (error || !playlist) {
    return (
      <View
        className="flex-1 items-center justify-center px-4"
        style={{
          backgroundColor: themeColors[theme]['bg-main']
        }}
      >
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom className="mt-4 text-center opacity-70">
          {error || 'Playlist not found'}
        </TextCustom>
        <RippleButton title="Go Back" onPress={handleBack} className="mt-4" />
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: themeColors[theme]['bg-main']
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: themeColors[theme]['bg-tertiary'],
          borderBottomWidth: 1,
          borderBottomColor: themeColors[theme].border,
          shadowColor: themeColors[theme]['bg-inverse'],
          shadowOffset: {
            width: 0,
            height: 2
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4
        }}
      >
        <View className="flex-row items-center justify-between">
          <RippleButton
            title="To playlists"
            variant="outline"
            size="sm"
            onPress={handleBack}
            leftIcon={
              <Entypo
                name="chevron-thin-left"
                size={15}
                color={themeColors[theme]['text-main']}
              />
            }
          />

          <View>
            {playlist.createdBy === user?.uid && (
              <View className="flex flex-row ">
                <IconButton
                  accessibilityLabel="Delete playlist"
                  onPress={handleDeletePlaylist}
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={20}
                    color={themeColors[theme]['intent-error']}
                  />
                </IconButton>

                <IconButton
                  accessibilityLabel="Edit playlist"
                  onPress={handleEditPlaylist}
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={20}
                    color={themeColors[theme]['text-main']}
                  />
                </IconButton>

                <IconButton
                  accessibilityLabel="Invite users"
                  onPress={handleInviteUsers}
                >
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={20}
                    color={themeColors[theme]['text-main']}
                  />
                </IconButton>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{
          paddingBottom: 16,
          paddingHorizontal: 16,
          paddingTop: 16,
          gap: 16
        }}
      >
        <View style={containerWidthStyle}>
          {/* Playlist Info */}
          <View className="gap-4">
            <View className="items-center">
              <TextCustom type="title" className="text-center">
                {playlist.name}
              </TextCustom>

              {playlist.description && (
                <TextCustom
                  size="m"
                  className="mt-2 text-center opacity-70"
                  color={themeColors[theme]['text-secondary']}
                >
                  {playlist.description}
                </TextCustom>
              )}
            </View>

            {/* Playlist Stats */}
            <View className="flex-row justify-center gap-6">
              <View className="items-center">
                <TextCustom type="bold" size="l">
                  {playlist.trackCount}
                </TextCustom>
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  Tracks
                </TextCustom>
              </View>

              <View className="items-center">
                <TextCustom type="bold" size="l">
                  {Math.floor(playlist.totalDuration / 60)}m
                </TextCustom>
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  Duration
                </TextCustom>
              </View>

              <View className="items-center">
                <TextCustom type="bold" size="l">
                  {playlist.participants.length}
                </TextCustom>
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  Members
                </TextCustom>
              </View>
            </View>

            {/* Playlist Settings */}
            <View className="flex-row justify-center gap-4">
              <View
                style={{
                  backgroundColor: `${themeColors[theme]['primary']}15`,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: themeColors[theme]['primary']
                }}
              >
                <TextCustom
                  size="s"
                  color={themeColors[theme]['primary']}
                  type="bold"
                >
                  {playlist.visibility === 'public' ? 'Public' : 'Private'}
                </TextCustom>
              </View>

              <View
                style={{
                  backgroundColor: `${themeColors[theme]['text-secondary']}15`,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: themeColors[theme]['text-secondary']
                }}
              >
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                  type="bold"
                >
                  {playlist.editPermissions === 'everyone'
                    ? 'All Can Edit'
                    : 'Invited Only'}
                </TextCustom>
              </View>
            </View>
          </View>

          {/* Tracks Section */}
          <View className="gap-4">
            <TextCustom type="subtitle" className="text-center">
              Tracks
            </TextCustom>

            <View className="items-center py-8">
              <MaterialCommunityIcons
                name="music-note"
                size={48}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom className="mt-4 text-center opacity-70">
                No tracks added yet
              </TextCustom>
              <TextCustom
                size="s"
                className="mt-2 text-center opacity-50"
                color={themeColors[theme]['text-secondary']}
              >
                Add tracks using the Deezer search
              </TextCustom>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Invite Users Modal */}
      <UserInviteComponent
        visible={showInviteModal}
        onClose={handleCloseInviteModal}
        onInvite={handleSendInvitations}
        excludeUserId={user?.uid}
        existingUsers={playlist.participants}
        placeholder="Search users by email or name..."
      />
    </View>
  );
};

export default PlaylistDetailScreen;

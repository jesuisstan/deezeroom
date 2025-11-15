import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Alert } from '@/components/modules/alert';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import RippleButton from '@/components/ui/buttons/RippleButton';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import {
  Playlist,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';

interface EditPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  playlist: Playlist;
  onPlaylistUpdated: () => void;
  onLeavePlaylist?: () => void;
}

const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({
  visible,
  onClose,
  playlist,
  onPlaylistUpdated,
  onLeavePlaylist
}) => {
  const { theme } = useTheme();
  const { user } = useUser();
  const [name, setName] = useState(playlist.name || '');
  const [description, setDescription] = useState(playlist.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Check if user is owner or participant
  const canEdit = React.useMemo(() => {
    if (!user || !playlist) return false;
    return (
      playlist.ownerId === user.uid ||
      playlist.participantIds.includes(user.uid)
    );
  }, [user, playlist]);

  // Reset form when modal opens/closes or playlist changes
  useEffect(() => {
    if (visible) {
      setName(playlist.name || '');
      setDescription(playlist.description || '');
    }
  }, [visible, playlist]);

  const handleSave = async () => {
    if (!name.trim()) {
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Please enter playlist name'
      });
      return;
    }

    if (!canEdit) {
      Notifier.shoot({
        type: 'error',
        title: 'Permission Denied',
        message: 'You do not have permission to edit this playlist'
      });
      return;
    }

    setIsLoading(true);
    try {
      const updates: { name: string; description?: string } = {
        name: name.trim()
      };

      // Only include description if it has a value
      if (description.trim()) {
        updates.description = description.trim();
      }

      await PlaylistService.updatePlaylist(playlist.id, updates);

      Notifier.shoot({
        type: 'success',
        title: 'Success',
        message: 'Playlist updated successfully'
      });

      onPlaylistUpdated();
      onClose();
    } catch (error) {
      Logger.error('Error updating playlist:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to update playlist'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeavePlaylist = () => {
    if (!user || !playlist) return;

    if (!playlist.participantIds.includes(user.uid)) return;

    const isOwner = playlist.ownerId === user.uid;

    if (isOwner) {
      const otherParticipantsCount = playlist.participantIds.filter(
        (id) => id !== user.uid
      ).length;

      if (otherParticipantsCount === 0) {
        // Owner is the only participant - delete playlist
        Alert.confirm(
          'Delete Playlist',
          'You are the only participant. Leaving will delete this playlist. Are you sure?',
          async () => {
            setIsLeaving(true);
            try {
              const result = await PlaylistService.leavePlaylist(
                playlist.id,
                user.uid
              );

              if (result.deleted) {
                Notifier.shoot({
                  type: 'success',
                  title: 'Playlist Deleted',
                  message: 'Playlist has been deleted'
                });

                if (onLeavePlaylist) {
                  onLeavePlaylist();
                }
              }
            } catch (error) {
              Logger.error('Error leaving playlist:', error);
              Notifier.shoot({
                type: 'error',
                title: 'Error',
                message: 'Failed to leave playlist'
              });
            } finally {
              setIsLeaving(false);
              onClose();
            }
          }
        );
      } else {
        // Owner leaving with other participants - transfer ownership
        Alert.confirm(
          'Leave Playlist',
          'You are the owner. Ownership will be transferred to another participant. Are you sure you want to leave?',
          async () => {
            setIsLeaving(true);
            try {
              await PlaylistService.leavePlaylist(playlist.id, user.uid);

              Notifier.shoot({
                type: 'success',
                title: 'Left Playlist',
                message: 'You have left the playlist'
              });

              if (onLeavePlaylist) {
                onLeavePlaylist();
              }
            } catch (error) {
              Logger.error('Error leaving playlist:', error);
              Notifier.shoot({
                type: 'error',
                title: 'Error',
                message: 'Failed to leave playlist'
              });
            } finally {
              setIsLeaving(false);
              onClose();
            }
          }
        );
      }
    } else {
      // Regular participant leaving
      Alert.confirm(
        'Leave Playlist',
        'Are you sure you want to leave this playlist?',
        async () => {
          setIsLeaving(true);
          try {
            await PlaylistService.leavePlaylist(playlist.id, user.uid);

            Notifier.shoot({
              type: 'success',
              title: 'Left Playlist',
              message: 'You have left the playlist'
            });

            if (onLeavePlaylist) {
              onLeavePlaylist();
            }
          } catch (error) {
            Logger.error('Error leaving playlist:', error);
            Notifier.shoot({
              type: 'error',
              title: 'Error',
              message: 'Failed to leave playlist'
            });
          } finally {
            setIsLeaving(false);
            onClose();
          }
        }
      );
    }
  };

  if (!canEdit) {
    return null;
  }

  return (
    <SwipeModal
      modalVisible={visible}
      setVisible={(v) => {
        if (!v) onClose();
      }}
      onClose={onClose}
      title="Edit Playlist"
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Name Input */}
          <View>
            <TextCustom
              type="semibold"
              size="m"
              color={themeColors[theme]['text-main']}
              className="mb-2"
            >
              Playlist Name
            </TextCustom>
            <InputCustom
              value={name}
              onChangeText={setName}
              placeholder="Enter playlist name"
              maxLength={100}
            />
          </View>

          {/* Description Input */}
          <View>
            <TextCustom
              type="semibold"
              size="m"
              color={themeColors[theme]['text-main']}
              className="mb-2"
            >
              Description
            </TextCustom>
            <InputCustom
              value={description}
              onChangeText={setDescription}
              placeholder="Enter playlist description (optional)"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <RippleButton
              title="Save Changes"
              size="md"
              onPress={handleSave}
              loading={isLoading}
              disabled={isLoading || isLeaving}
            />

            <RippleButton
              size="md"
              title="Leave Playlist"
              onPress={handleLeavePlaylist}
              loading={isLeaving}
              disabled={isLoading || isLeaving}
              color={themeColors[theme]['intent-error']}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SwipeModal>
  );
};

export default EditPlaylistModal;

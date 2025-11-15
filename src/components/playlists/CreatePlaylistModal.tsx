import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import RippleButton from '@/components/ui/buttons/RippleButton';
import ImageUploader from '@/components/ui/ImageUploader';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { PlaylistService } from '@/utils/firebase/firebase-service-playlists';
import { StorageService } from '@/utils/firebase/firebase-service-storage';
import { UserProfile } from '@/utils/firebase/firebase-service-user';

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onPlaylistCreated: (playlistId: string) => void;
  userData: UserProfile;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  visible,
  onClose,
  onPlaylistCreated,
  userData
}) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [editPermissions, setEditPermissions] = useState<
    'everyone' | 'invited'
  >('everyone');
  const [isLoading, setIsLoading] = useState(false);
  const [coverImageUri, setCoverImageUri] = useState<string>('');

  const handleClose = () => {
    // Reset form state
    setName('');
    setDescription('');
    setVisibility('public');
    setEditPermissions('everyone');
    setCoverImageUri('');
    onClose();
  };

  // Auto-adjust edit permissions only when switching to private
  useEffect(() => {
    if (visibility === 'private') {
      // For private playlists, "invited" makes more sense as default
      // since private playlists are typically for invited users only
      setEditPermissions('invited');
    }
    // Don't auto-change when switching to public - let user choose
  }, [visibility]);

  const handleCreatePlaylist = async () => {
    if (!name.trim()) {
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Please enter playlist name'
      });
      return;
    }

    setIsLoading(true);
    try {
      // First create the playlist
      const playlistData: any = {
        name: name.trim(),
        visibility,
        editPermissions,
        ownerId: userData?.uid || ''
      };

      // Only add description if it's not empty
      if (description.trim()) {
        playlistData.description = description.trim();
      }

      const playlistId = await PlaylistService.createPlaylist(
        playlistData,
        userData?.uid || ''
      );

      // If there's a cover image, upload it
      if (coverImageUri) {
        try {
          const imageUrl = await StorageService.uploadPlaylistCover(
            playlistId,
            coverImageUri
          );
          await PlaylistService.updatePlaylistCover(playlistId, imageUrl);
        } catch (imageError) {
          Logger.error(
            'Error uploading cover image:',
            imageError,
            '📝 CreatePlaylistModal'
          );
          // Don't fail the entire operation if image upload fails
          Notifier.shoot({
            type: 'warn',
            title: 'Warning',
            message: 'Playlist created but cover image upload failed'
          });
        }
      }

      onPlaylistCreated(playlistId);
      handleClose();
      Notifier.shoot({
        type: 'success',
        title: 'Success',
        message: `Playlist "${name}" created successfully`
      });
    } catch (error) {
      Logger.error('Error creating playlist:', error, '📝 CreatePlaylistModal');
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to create playlist'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SwipeModal
      title="Create Playlist"
      modalVisible={visible}
      setVisible={onClose}
      onClose={handleClose}
    >
      <View className="flex-1 gap-4 px-4 py-4">
        {/* Cover Image */}
        <View className="items-center">
          <ImageUploader
            currentImageUrl={coverImageUri}
            onImageUploaded={setCoverImageUri}
            placeholder="Add Cover"
            size="md"
            shape="square"
          />
        </View>

        {/* Name Input */}
        <View>
          <TextCustom className="mb-2" type="bold">
            Name *
          </TextCustom>
          <InputCustom
            value={name}
            onChangeText={setName}
            placeholder="Enter playlist name"
            variant="default"
          />
        </View>

        {/* Description Input */}
        <View>
          <TextCustom className="mb-2" type="bold">
            Description
          </TextCustom>
          <InputCustom
            value={description}
            onChangeText={setDescription}
            placeholder="Playlist description (optional)"
            multiline
            numberOfLines={3}
            variant="default"
          />
        </View>

        {/* Visibility Settings */}
        <View>
          <TextCustom className="mb-2" type="bold">
            Visibility
          </TextCustom>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setVisibility('public')}
              className="flex-1 rounded-xl border p-1"
              style={{
                backgroundColor:
                  visibility === 'public'
                    ? `${themeColors[theme]['primary']}15`
                    : themeColors[theme]['bg-main'],
                borderColor:
                  visibility === 'public'
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['border']
              }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <MaterialCommunityIcons
                  name="earth"
                  size={18}
                  color={
                    visibility === 'public'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  size="s"
                  color={
                    visibility === 'public'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-main']
                  }
                >
                  Public
                </TextCustom>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setVisibility('private')}
              className="flex-1 rounded-xl border p-1"
              style={{
                backgroundColor:
                  visibility === 'private'
                    ? `${themeColors[theme]['primary']}15`
                    : themeColors[theme]['bg-main'],
                borderColor:
                  visibility === 'private'
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['border']
              }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <MaterialCommunityIcons
                  name="lock"
                  size={18}
                  color={
                    visibility === 'private'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  size="s"
                  color={
                    visibility === 'private'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-main']
                  }
                >
                  Private
                </TextCustom>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Edit Permissions */}
        <View>
          <TextCustom className="mb-2" type="bold">
            Edit Permissions
          </TextCustom>
          {visibility === 'private' ? (
            // For private playlists, only "Invited Only" is allowed
            <View
              className="rounded-xl border p-1"
              style={{
                backgroundColor: `${themeColors[theme]['primary']}15`,
                borderColor: themeColors[theme]['primary']
              }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <MaterialCommunityIcons
                  name="account"
                  size={18}
                  color={themeColors[theme]['primary']}
                />
                <TextCustom
                  type="bold"
                  size="s"
                  color={themeColors[theme]['primary']}
                >
                  Invited Only
                </TextCustom>
              </View>
            </View>
          ) : (
            // For public playlists, show both options
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setEditPermissions('everyone')}
                className="flex-1 rounded-xl border p-1"
                style={{
                  backgroundColor:
                    editPermissions === 'everyone'
                      ? `${themeColors[theme]['primary']}15`
                      : themeColors[theme]['bg-main'],
                  borderColor:
                    editPermissions === 'everyone'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['border']
                }}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <MaterialCommunityIcons
                    name="account-multiple"
                    size={18}
                    color={
                      editPermissions === 'everyone'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-secondary']
                    }
                  />
                  <TextCustom
                    type="bold"
                    size="s"
                    color={
                      editPermissions === 'everyone'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-main']
                    }
                  >
                    Everyone
                  </TextCustom>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setEditPermissions('invited')}
                className="flex-1 rounded-xl border p-1"
                style={{
                  backgroundColor:
                    editPermissions === 'invited'
                      ? `${themeColors[theme]['primary']}15`
                      : themeColors[theme]['bg-main'],
                  borderColor:
                    editPermissions === 'invited'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['border']
                }}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <MaterialCommunityIcons
                    name="account"
                    size={18}
                    color={
                      editPermissions === 'invited'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-secondary']
                    }
                  />
                  <TextCustom
                    type="bold"
                    size="s"
                    color={
                      editPermissions === 'invited'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-main']
                    }
                  >
                    Invited Only
                  </TextCustom>
                </View>
              </Pressable>
            </View>
          )}

          {/* Detailed explanations */}
          <View className="mt-2 gap-1">
            <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
              {visibility === 'private'
                ? '• Only invited users can edit this private playlist'
                : editPermissions === 'everyone'
                  ? '• All users can edit this public playlist'
                  : '• Only invited users can edit this public playlist'}
            </TextCustom>
          </View>
        </View>

        {/* Action Button */}
        <View className="mt-4">
          <RippleButton
            title="Create"
            onPress={handleCreatePlaylist}
            loading={isLoading}
            width="full"
            disabled={!name.trim() || !visibility || !editPermissions}
          />
        </View>
      </View>
    </SwipeModal>
  );
};

export default CreatePlaylistModal;

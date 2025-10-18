import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import RippleButton from '@/components/ui/buttons/RippleButton';
import ImageUploader from '@/components/ui/ImageUploader';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { PlaylistService } from '@/utils/firebase/firebase-service-playlists';
import { StorageService } from '@/utils/firebase/firebase-service-storage';

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onPlaylistCreated: (playlistId: string) => void;
  userId: string;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  visible,
  onClose,
  onPlaylistCreated,
  userId
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
        createdBy: userId,
        participants: []
      };

      // Only add description if it's not empty
      if (description.trim()) {
        playlistData.description = description.trim();
      }

      const playlistId = await PlaylistService.createPlaylist(
        playlistData,
        userId
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

      Notifier.shoot({
        type: 'success',
        title: 'Success',
        message: 'Playlist created!'
      });

      onPlaylistCreated(playlistId);
      onClose();
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

  const handleClose = () => {
    onClose();
  };

  return (
    <SwipeModal
      title="Create Playlist"
      modalVisible={visible}
      setVisible={onClose}
      onClose={handleClose}
    >
      <View className="flex-1 gap-6 px-4 pb-4">
        {/* Cover Image */}
        <View>
          <TextCustom className="mb-3" type="subtitle">
            Cover Image
          </TextCustom>
          <View className="items-start">
            <ImageUploader
              currentImageUrl={coverImageUri}
              onImageUploaded={setCoverImageUri}
              placeholder="Add Cover"
              size="md"
              shape="square"
            />
          </View>
        </View>

        {/* Name Input */}
        <InputCustom
          label="Name *"
          value={name}
          onChangeText={setName}
          placeholder="Enter playlist name"
          variant="default"
        />

        {/* Description Input */}
        <InputCustom
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Playlist description (optional)"
          multiline
          numberOfLines={3}
          variant="default"
        />

        {/* Visibility Settings */}
        <View>
          <TextCustom className="mb-3" type="subtitle">
            Visibility
          </TextCustom>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setVisibility('public')}
              className="flex-1 rounded-xl border-2 p-4"
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
                  size={20}
                  color={
                    visibility === 'public'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  style={{
                    color:
                      visibility === 'public'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-main']
                  }}
                >
                  Public
                </TextCustom>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setVisibility('private')}
              className="flex-1 rounded-xl border-2 p-4"
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
                  size={20}
                  color={
                    visibility === 'private'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  style={{
                    color:
                      visibility === 'private'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-main']
                  }}
                >
                  Private
                </TextCustom>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Edit Permissions */}
        <View>
          <TextCustom className="mb-3" type="subtitle">
            Edit Permissions
          </TextCustom>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setEditPermissions('everyone')}
              className="flex-1 rounded-xl border-2 p-4"
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
                  size={20}
                  color={
                    editPermissions === 'everyone'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  style={{
                    color:
                      editPermissions === 'everyone'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-main']
                  }}
                >
                  Everyone
                </TextCustom>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setEditPermissions('invited')}
              className="flex-1 rounded-xl border-2 p-4"
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
                  size={20}
                  color={
                    editPermissions === 'invited'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  style={{
                    color:
                      editPermissions === 'invited'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-main']
                  }}
                >
                  Invited Only
                </TextCustom>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Actions */}
        <View className="mt-4 flex-row gap-3">
          <RippleButton
            title="Cancel"
            variant="outline"
            onPress={handleClose}
            className="flex-1"
          />
          <RippleButton
            title="Create"
            onPress={handleCreatePlaylist}
            loading={isLoading}
            className="flex-1"
          />
        </View>
      </View>
    </SwipeModal>
  );
};

export default CreatePlaylistModal;

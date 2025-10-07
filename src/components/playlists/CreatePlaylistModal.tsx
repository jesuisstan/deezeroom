import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import RippleButton from '@/components/ui/buttons/RippleButton';
import ImageUpload from '@/components/ui/ImageUpload';
import { TextCustom } from '@/components/ui/TextCustom';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { PlaylistService } from '@/utils/firebase/firebase-service-playlists';
import { StorageService } from '@/utils/firebase/firebase-service-storage';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onPlaylistCreated: (playlistId: string) => void;
  userId: string;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
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
      const playlistId = await PlaylistService.createPlaylist(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
          editPermissions,
          createdBy: userId,
          participants: []
        },
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
          console.error('Error uploading cover image:', imageError);
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
      console.error('Error creating playlist:', error);
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
    <View
      className="absolute inset-0 z-50 flex-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center p-4"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center">
            <View
              className="max-h-[90%] rounded-lg p-6"
              style={{
                backgroundColor:
                  theme === 'dark'
                    ? themeColors.dark['bg-secondary']
                    : themeColors.light['bg-secondary']
              }}
            >
              {/* Header */}
              <View className="mb-6 flex-row items-center justify-between">
                <TextCustom type="title">Create Playlist</TextCustom>
                <Pressable
                  onPress={onClose}
                  className="rounded-full p-2 active:opacity-70"
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={themeColors[theme]['text-main']}
                  />
                </Pressable>
              </View>

              {/* Form */}
              <View className="gap-4">
                {/* Cover Image */}
                <View>
                  <TextCustom className="mb-2">Cover Image</TextCustom>
                  <View className="items-start">
                    <ImageUpload
                      currentImageUrl={coverImageUri}
                      onImageUploaded={setCoverImageUri}
                      placeholder="Add Cover"
                      size="md"
                      shape="square"
                    />
                  </View>
                </View>

                {/* Name Input */}
                <View>
                  <TextCustom className="mb-2">Name *</TextCustom>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter playlist name"
                    className="rounded-lg border border-gray-300 p-3"
                    style={{
                      backgroundColor:
                        theme === 'dark'
                          ? themeColors.dark['bg-main']
                          : themeColors.light['bg-main'],
                      borderColor:
                        theme === 'dark'
                          ? themeColors.dark['border']
                          : themeColors.light['border'],
                      color: themeColors[theme]['text-main']
                    }}
                    placeholderTextColor={themeColors[theme]['text-secondary']}
                  />
                </View>

                {/* Description Input */}
                <View>
                  <TextCustom className="mb-2">Description</TextCustom>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Playlist description (optional)"
                    multiline
                    numberOfLines={3}
                    className="rounded-lg border border-gray-300 p-3"
                    style={{
                      backgroundColor:
                        theme === 'dark'
                          ? themeColors.dark['bg-main']
                          : themeColors.light['bg-main'],
                      borderColor:
                        theme === 'dark'
                          ? themeColors.dark['border']
                          : themeColors.light['border'],
                      color: themeColors[theme]['text-main']
                    }}
                    placeholderTextColor={themeColors[theme]['text-secondary']}
                  />
                </View>

                {/* Visibility Settings */}
                <View>
                  <TextCustom className="mb-2">Visibility</TextCustom>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setVisibility('public')}
                      className={`flex-1 rounded-lg border p-3 ${
                        visibility === 'public'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                      style={{
                        backgroundColor:
                          visibility === 'public'
                            ? theme === 'dark'
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'rgba(59, 130, 246, 0.1)'
                            : theme === 'dark'
                              ? themeColors.dark['bg-main']
                              : themeColors.light['bg-main'],
                        borderColor:
                          visibility === 'public'
                            ? themeColors[theme]['primary']
                            : themeColors[theme]['border']
                      }}
                    >
                      <View className="flex-row items-center justify-center gap-2">
                        <MaterialCommunityIcons
                          name="earth"
                          size={16}
                          color={
                            visibility === 'public'
                              ? themeColors[theme]['primary']
                              : themeColors[theme]['text-secondary']
                          }
                        />
                        <TextCustom
                          size="xs"
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
                      className={`flex-1 rounded-lg border p-3 ${
                        visibility === 'private'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                      style={{
                        backgroundColor:
                          visibility === 'private'
                            ? theme === 'dark'
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'rgba(59, 130, 246, 0.1)'
                            : theme === 'dark'
                              ? themeColors.dark['bg-main']
                              : themeColors.light['bg-main'],
                        borderColor:
                          visibility === 'private'
                            ? themeColors[theme]['primary']
                            : themeColors[theme]['border']
                      }}
                    >
                      <View className="flex-row items-center justify-center gap-2">
                        <MaterialCommunityIcons
                          name="lock"
                          size={16}
                          color={
                            visibility === 'private'
                              ? themeColors[theme]['primary']
                              : themeColors[theme]['text-secondary']
                          }
                        />
                        <TextCustom
                          size="xs"
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
                  <TextCustom className="mb-2">Edit Permissions</TextCustom>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setEditPermissions('everyone')}
                      className={`flex-1 rounded-lg border p-3 ${
                        editPermissions === 'everyone'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                      style={{
                        backgroundColor:
                          editPermissions === 'everyone'
                            ? theme === 'dark'
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'rgba(59, 130, 246, 0.1)'
                            : theme === 'dark'
                              ? themeColors.dark['bg-main']
                              : themeColors.light['bg-main'],
                        borderColor:
                          editPermissions === 'everyone'
                            ? themeColors[theme]['primary']
                            : themeColors[theme]['border']
                      }}
                    >
                      <View className="flex-row items-center justify-center gap-2">
                        <MaterialCommunityIcons
                          name="account-multiple"
                          size={16}
                          color={
                            editPermissions === 'everyone'
                              ? themeColors[theme]['primary']
                              : themeColors[theme]['text-secondary']
                          }
                        />
                        <TextCustom
                          size="xs"
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
                      className={`flex-1 rounded-lg border p-3 ${
                        editPermissions === 'invited'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                      style={{
                        backgroundColor:
                          editPermissions === 'invited'
                            ? theme === 'dark'
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'rgba(59, 130, 246, 0.1)'
                            : theme === 'dark'
                              ? themeColors.dark['bg-main']
                              : themeColors.light['bg-main'],
                        borderColor:
                          editPermissions === 'invited'
                            ? themeColors[theme]['primary']
                            : themeColors[theme]['border']
                      }}
                    >
                      <View className="flex-row items-center justify-center gap-2">
                        <MaterialCommunityIcons
                          name="account"
                          size={16}
                          color={
                            editPermissions === 'invited'
                              ? themeColors[theme]['primary']
                              : themeColors[theme]['text-secondary']
                          }
                        />
                        <TextCustom
                          size="xs"
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
              </View>

              {/* Actions */}
              <View className="mt-6 flex-row gap-3">
                <RippleButton
                  title="Cancel"
                  variant="outline"
                  onPress={onClose}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default CreatePlaylistModal;

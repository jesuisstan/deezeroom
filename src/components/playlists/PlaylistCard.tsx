import React from 'react';
import { Image, Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface PlaylistCardProps {
  playlist: Playlist;
  onPress: (playlist: Playlist) => void;
  onEdit?: (playlist: Playlist) => void;
  showEditButton?: boolean;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onPress,
  onEdit,
  showEditButton = false
}) => {
  const { theme } = useTheme();

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes}м`;
  };

  const getVisibilityIcon = () => {
    return playlist.visibility === 'public' ? 'earth' : 'lock';
  };

  const getEditPermissionsIcon = () => {
    return playlist.editPermissions === 'everyone'
      ? 'account-multiple'
      : 'account';
  };

  return (
    <Pressable
      onPress={() => onPress(playlist)}
      className="mb-3 rounded-lg border border-gray-200 p-4 active:opacity-70"
      style={{
        backgroundColor:
          theme === 'dark'
            ? themeColors.dark['bg-secondary']
            : themeColors.light['bg-secondary'],
        borderColor:
          theme === 'dark'
            ? themeColors.dark['border']
            : themeColors.light['border']
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-start gap-3">
          {/* Cover Image */}
          <View className="h-16 w-16 overflow-hidden rounded-lg">
            {playlist.coverImageUrl ? (
              <Image
                source={{ uri: playlist.coverImageUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View
                className="h-full w-full items-center justify-center"
                style={{
                  backgroundColor:
                    theme === 'dark'
                      ? themeColors.dark['bg-main']
                      : themeColors.light['bg-main']
                }}
              >
                <MaterialCommunityIcons
                  name="music"
                  size={24}
                  color={themeColors[theme]['text-secondary']}
                />
              </View>
            )}
          </View>

          {/* Content */}
          <View className="flex-1">
            {/* Playlist Name */}
            <TextCustom type="subtitle" className="mb-1">
              {playlist.name}
            </TextCustom>

            {/* Description */}
            {playlist.description && (
              <TextCustom className="mb-2 opacity-70">
                {playlist.description}
              </TextCustom>
            )}

            {/* Metadata */}
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1">
                <MaterialCommunityIcons
                  name="music-note"
                  size={14}
                  color={themeColors[theme]['text-secondary']}
                />
                <TextCustom size="xs" className="opacity-70">
                  {playlist.trackCount} tracks
                </TextCustom>
              </View>

              <View className="flex-row items-center gap-1">
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color={themeColors[theme]['text-secondary']}
                />
                <TextCustom size="xs" className="opacity-70">
                  {formatDuration(playlist.totalDuration)}
                </TextCustom>
              </View>

              <View className="flex-row items-center gap-1">
                <MaterialCommunityIcons
                  name="account-multiple"
                  size={14}
                  color={themeColors[theme]['text-secondary']}
                />
                <TextCustom size="xs" className="opacity-70">
                  {playlist.participants.length} participants
                </TextCustom>
              </View>
            </View>

            {/* Visibility and Permissions */}
            <View className="mt-2 flex-row items-center gap-3">
              <View className="flex-row items-center gap-1">
                <MaterialCommunityIcons
                  name={getVisibilityIcon()}
                  size={12}
                  color={themeColors[theme]['text-secondary']}
                />
                <TextCustom size="xs" className="opacity-60">
                  {playlist.visibility === 'public' ? 'Public' : 'Private'}
                </TextCustom>
              </View>

              <View className="flex-row items-center gap-1">
                <MaterialCommunityIcons
                  name={getEditPermissionsIcon()}
                  size={12}
                  color={themeColors[theme]['text-secondary']}
                />
                <TextCustom size="xs" className="opacity-60">
                  {playlist.editPermissions === 'everyone'
                    ? 'Everyone can edit'
                    : 'Invited only'}
                </TextCustom>
              </View>
            </View>
          </View>
        </View>

        {/* Edit Button */}
        {showEditButton && onEdit && (
          <Pressable
            onPress={() => onEdit(playlist)}
            className="ml-3 rounded-full p-2 active:opacity-70"
            style={{
              backgroundColor:
                theme === 'dark'
                  ? themeColors.dark['bg-main']
                  : themeColors.light['bg-main']
            }}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={16}
              color={themeColors[theme]['text-main']}
            />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

export default PlaylistCard;

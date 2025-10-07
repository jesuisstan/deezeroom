import React from 'react';
import { Image, Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

import IconButton from '@/components/ui/buttons/IconButton';
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

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

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

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(0.8, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => onPress(playlist)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="mb-3 rounded-xl border p-4"
        style={{
          backgroundColor: themeColors[theme]['bg-secondary'],
          borderColor: themeColors[theme]['border'],
          shadowColor: themeColors[theme]['bg-inverse'],
          shadowOffset: {
            width: 0,
            height: 2
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 flex-row items-start gap-3">
            {/* Cover Image */}
            <View
              className="h-16 w-16 overflow-hidden rounded-xl"
              style={{
                backgroundColor: themeColors[theme]['bg-tertiary'],
                shadowColor: themeColors[theme]['bg-inverse'],
                shadowOffset: {
                  width: 0,
                  height: 1
                },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1
              }}
            >
              {playlist.coverImageUrl ? (
                <Image
                  source={{ uri: playlist.coverImageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center">
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
                  <TextCustom
                    size="xs"
                    style={{ color: themeColors[theme]['text-secondary'] }}
                  >
                    {playlist.trackCount} tracks
                  </TextCustom>
                </View>

                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={themeColors[theme]['text-secondary']}
                  />
                  <TextCustom
                    size="xs"
                    style={{ color: themeColors[theme]['text-secondary'] }}
                  >
                    {formatDuration(playlist.totalDuration)}
                  </TextCustom>
                </View>

                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons
                    name="account-multiple"
                    size={14}
                    color={themeColors[theme]['text-secondary']}
                  />
                  <TextCustom
                    size="xs"
                    style={{ color: themeColors[theme]['text-secondary'] }}
                  >
                    {playlist.participants.length} participants
                  </TextCustom>
                </View>
              </View>

              {/* Visibility and Permissions */}
              <View className="mt-3 flex-row items-center gap-4">
                <View
                  className="flex-row items-center gap-1 rounded-full px-2 py-1"
                  style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
                >
                  <MaterialCommunityIcons
                    name={getVisibilityIcon()}
                    size={12}
                    color={themeColors[theme]['text-secondary']}
                  />
                  <TextCustom
                    size="xs"
                    style={{ color: themeColors[theme]['text-secondary'] }}
                  >
                    {playlist.visibility === 'public' ? 'Public' : 'Private'}
                  </TextCustom>
                </View>

                <View
                  className="flex-row items-center gap-1 rounded-full px-2 py-1"
                  style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
                >
                  <MaterialCommunityIcons
                    name={getEditPermissionsIcon()}
                    size={12}
                    color={themeColors[theme]['text-secondary']}
                  />
                  <TextCustom
                    size="xs"
                    style={{ color: themeColors[theme]['text-secondary'] }}
                  >
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
            <IconButton
              accessibilityLabel="Edit playlist"
              onPress={() => onEdit(playlist)}
              className="ml-3"
            >
              <MaterialCommunityIcons
                name="pencil"
                size={16}
                color={themeColors[theme]['text-main']}
              />
            </IconButton>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default PlaylistCard;

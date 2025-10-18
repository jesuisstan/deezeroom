import React from 'react';
import { Image, Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { usePressAnimation } from '@/style/usePressAnimation';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface PlaylistCardProps {
  playlist: Playlist;
  onPress: (playlist: Playlist) => void;
  onEdit?: (playlist: Playlist) => void;
  onDelete?: (playlist: Playlist) => void;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onPress,
  onEdit,
  onDelete,
  showEditButton = false,
  showDeleteButton = false
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getVisibilityIcon = () => {
    return playlist.visibility === 'public' ? 'earth' : 'lock';
  };

  const getEditPermissionsIcon = () => {
    return playlist.editPermissions === 'everyone'
      ? 'account-multiple'
      : 'account';
  };

  const handleCardPress = () => {
    router.push(`/playlist/${playlist.id}` as any);
  };

  return (
    <Animated.View style={[{ marginBottom: 12 }, animatedStyle]}>
      <Pressable
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={null}
        style={{
          width: 160, // Fixed width for consistent grid
          height: 160,
          backgroundColor: themeColors[theme]['bg-secondary'],
          borderRadius: 12,
          padding: 12,
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
        {/* Cover Image with Overlay */}
        <View
          style={{
            position: 'relative',
            height: 80,
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 8
          }}
        >
          {playlist.coverImageUrl ? (
            <Image
              source={{ uri: playlist.coverImageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: themeColors[theme]['bg-tertiary'],
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MaterialCommunityIcons
                name="music"
                size={32}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          )}

          {/* Dark overlay for text readability */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }}
          />

          {/* Action buttons overlay */}
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              flexDirection: 'row',
              gap: 4
            }}
          >
            {showEditButton && onEdit && (
              <IconButton
                accessibilityLabel="Edit playlist"
                onPress={() => onEdit(playlist)}
                backgroundColor="rgba(255, 255, 255, 0.9)"
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={14}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>
            )}

            {showDeleteButton && onDelete && (
              <IconButton
                accessibilityLabel="Delete playlist"
                onPress={() => onDelete(playlist)}
                backgroundColor="rgba(255, 255, 255, 0.9)"
              >
                <MaterialCommunityIcons
                  name="delete"
                  size={14}
                  color={themeColors[theme]['intent-error']}
                />
              </IconButton>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={{ flex: 1, gap: 4 }}>
          {/* Playlist Name */}
          <TextCustom type="bold" size="s" numberOfLines={1}>
            {playlist.name}
          </TextCustom>

          {/* Metadata */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <MaterialCommunityIcons
                name="music-note"
                size={12}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                {playlist.trackCount}
              </TextCustom>
            </View>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={12}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                {formatDuration(playlist.totalDuration)}
              </TextCustom>
            </View>
          </View>

          {/* Visibility and Permissions */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                backgroundColor: themeColors[theme]['bg-tertiary'],
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8
              }}
            >
              <MaterialCommunityIcons
                name={getVisibilityIcon()}
                size={10}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                {playlist.visibility === 'public' ? 'Public' : 'Private'}
              </TextCustom>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                backgroundColor: themeColors[theme]['bg-tertiary'],
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8
              }}
            >
              <MaterialCommunityIcons
                name={getEditPermissionsIcon()}
                size={10}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                {playlist.editPermissions === 'everyone' ? 'All' : 'Invited'}
              </TextCustom>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default PlaylistCard;

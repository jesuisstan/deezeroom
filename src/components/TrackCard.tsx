import React from 'react';
import { Image, View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Track } from '@/graphql/schema';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { UserService } from '@/utils/firebase/firebase-service-user';

interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: (track: Track) => void;
}

const TrackCard: React.FC<TrackCardProps> = ({
  track,
  isPlaying = false,
  onPlay
}) => {
  const { theme } = useTheme();
  const { user, profile, updateProfile } = useUser();

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    onPlay?.(track);
  };

  const isFavorite = (trackId: string): boolean => {
    return profile?.favoriteTracks?.includes(trackId) || false;
  };

  const handleToggleFavorite = async () => {
    if (!user || !profile) {
      Notifier.error('You must be logged in to manage favorites');
      return;
    }

    try {
      const result = await UserService.toggleFavoriteTrack(user.uid, track.id);
      if (result.success) {
        // Update profile optimistically
        const updatedFavorites = result.isFavorite
          ? [...(profile.favoriteTracks || []), track.id]
          : (profile.favoriteTracks || []).filter((id) => id !== track.id);

        await updateProfile({ favoriteTracks: updatedFavorites });
        Notifier.success(result.message || 'Favorites updated');
      } else {
        Notifier.error(result.message || 'Failed to update favorites');
      }
    } catch (error) {
      Logger.error('Error toggling favorite:', error);
      Notifier.error('Failed to update favorites');
    }
  };

  return (
    <View className="mb-3 rounded-lg border border-border bg-bg-secondary p-3">
      <View className="flex-row items-center gap-3">
        {track.album.cover && (
          <Image
            source={{ uri: track.album.cover }}
            className="h-12 w-12 rounded"
            resizeMode="cover"
          />
        )}
        <View className="flex-1">
          <TextCustom type="semibold" size="s">
            {track.title}
          </TextCustom>
          <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
            {track.artist.name}
          </TextCustom>
          <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
            {track.album.title} • {formatDuration(track.duration)}
          </TextCustom>
          {track.explicitLyrics && (
            <TextCustom size="xs" color={themeColors[theme]['intent-warning']}>
              Explicit
            </TextCustom>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-2">
          {/* Play Button */}
          <IconButton
            accessibilityLabel={isPlaying ? 'Pause track' : 'Play track'}
            onPress={handlePlay}
            className="h-8 w-8"
            disabled={!track.preview}
          >
            <FontAwesome
              name={isPlaying ? 'pause' : 'play'}
              size={14}
              color={themeColors[theme]['primary']}
            />
          </IconButton>

          {/* Favorite Button */}
          <IconButton
            accessibilityLabel={
              isFavorite(track.id)
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
            onPress={handleToggleFavorite}
            className="h-8 w-8"
          >
            <FontAwesome
              name={isFavorite(track.id) ? 'heart' : 'heart-o'}
              size={14}
              color={
                isFavorite(track.id)
                  ? themeColors[theme]['intent-error']
                  : themeColors[theme]['text-secondary']
              }
            />
          </IconButton>
        </View>
      </View>
    </View>
  );
};

export default TrackCard;

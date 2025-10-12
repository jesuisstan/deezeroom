import React, { useCallback, useMemo } from 'react';
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

  // Memoize colors
  const colors = useMemo(
    () => ({
      primary: themeColors[theme]['primary'],
      textSecondary: themeColors[theme]['text-secondary'],
      intentError: themeColors[theme]['intent-error'],
      intentWarning: themeColors[theme]['intent-warning']
    }),
    [theme]
  );

  // Memoize formatted duration
  const formattedDuration = useMemo(() => {
    const minutes = Math.floor(track.duration / 60);
    const remainingSeconds = track.duration % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, [track.duration]);

  // Memoize check favorite
  const isTrackFavorite = useMemo(() => {
    return profile?.favoriteTracks?.includes(track.id) || false;
  }, [profile?.favoriteTracks, track.id]);

  // Memoize handle play
  const handlePlay = useCallback(() => {
    onPlay?.(track);
  }, [onPlay, track]);

  // Memoize handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
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
      Logger.error('Error toggling favorite:', error, '🔍 TrackCard');
      Notifier.error('Failed to update favorites');
    }
  }, [user, profile, track.id, updateProfile]);

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
          <TextCustom size="xs" color={colors.textSecondary}>
            {track.artist.name}
          </TextCustom>
          <TextCustom size="xs" color={colors.textSecondary}>
            {track.album.title} • {formattedDuration}
          </TextCustom>
          {track.explicitLyrics && (
            <TextCustom size="xs" color={colors.intentWarning}>
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
          >
            <FontAwesome
              name={isPlaying ? 'pause' : 'play'}
              size={14}
              color={colors.primary}
            />
          </IconButton>

          {/* Favorite Button */}
          <IconButton
            accessibilityLabel={
              isTrackFavorite ? 'Remove from favorites' : 'Add to favorites'
            }
            onPress={handleToggleFavorite}
            className="h-8 w-8"
          >
            <FontAwesome
              name={isTrackFavorite ? 'heart' : 'heart-o'}
              size={14}
              color={
                isTrackFavorite ? colors.intentError : colors.textSecondary
              }
            />
          </IconButton>
        </View>
      </View>
    </View>
  );
};

export default React.memo(TrackCard);

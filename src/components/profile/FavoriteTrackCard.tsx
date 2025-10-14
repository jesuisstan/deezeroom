import React, { useCallback, useMemo } from 'react';
import { Image, View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Track } from '@/graphql/schema';
import { useFavoriteTracks } from '@/hooks/useFavoriteTracks';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { getAlbumCover } from '@/utils/image-utils';

interface FavoriteTrackCardProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: (track: Track) => void;
}

const FavoriteTrackCard: React.FC<FavoriteTrackCardProps> = ({
  track,
  isPlaying = false,
  onPlay
}) => {
  const { theme } = useTheme();
  const { removeFromFavorites } = useFavoriteTracks();

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

  // Get album cover image (using small size for card)
  const albumCoverUrl = useMemo(() => {
    return getAlbumCover(track.album, 'small');
  }, [track.album]);

  // Memoize handle play
  const handlePlay = useCallback(() => {
    onPlay?.(track);
  }, [onPlay, track]);

  // Memoize handle remove from favorites
  const handleRemoveFromFavorites = useCallback(async () => {
    await removeFromFavorites(track.id);
  }, [removeFromFavorites, track.id]);

  return (
    <View className="mb-2 rounded-lg border border-border bg-bg-secondary px-2 py-1">
      <View className="flex-row items-center gap-3">
        {albumCoverUrl && (
          <Image
            source={{ uri: albumCoverUrl }}
            className="h-14 w-14 rounded"
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
            className="h-9 w-9"
            disabled={!track.preview}
          >
            <FontAwesome
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color={colors.primary}
            />
          </IconButton>

          {/* Remove from Favorites Button */}
          <IconButton
            accessibilityLabel="Remove from favorites"
            onPress={handleRemoveFromFavorites}
            className="h-9 w-9"
          >
            <FontAwesome name="trash" size={18} color={colors.intentError} />
          </IconButton>
        </View>
      </View>
    </View>
  );
};

export default React.memo(FavoriteTrackCard);

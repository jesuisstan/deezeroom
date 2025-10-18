import React, { useCallback, useMemo } from 'react';
import { Image, View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';

import AnimatedTrackTitle from '@/components/search-tracks/AnimatedTrackTitle';
import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Track } from '@/graphql/schema';
import { useFavoriteTracks } from '@/hooks/useFavoriteTracks';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { getAlbumCover } from '@/utils/image-utils';

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
  const { isTrackFavorite, toggleFavoriteTrack } = useFavoriteTracks();

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

  // Check if current track is favorite
  const isCurrentTrackFavorite = useMemo(() => {
    return isTrackFavorite(track.id);
  }, [isTrackFavorite, track.id]);

  // Get album cover image (using small size for card)
  const albumCoverUrl = useMemo(() => {
    return getAlbumCover(track.album, 'small');
  }, [track.album]);

  // Memoize handle play
  const handlePlay = useCallback(() => {
    onPlay?.(track);
  }, [onPlay, track]);

  // Memoize handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    await toggleFavoriteTrack(track.id);
  }, [toggleFavoriteTrack, track.id]);

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
          {/*<AnimatedTrackTitle
            title={track.title}
            textColor={themeColors[theme]['text-main']}
          />*/}
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

          {/* Favorite Button */}
          <IconButton
            accessibilityLabel={
              isCurrentTrackFavorite
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
            onPress={handleToggleFavorite}
            className="h-9 w-9"
          >
            <FontAwesome
              name={isCurrentTrackFavorite ? 'heart' : 'heart-o'}
              size={18}
              color={
                isCurrentTrackFavorite
                  ? colors.intentError
                  : colors.textSecondary
              }
            />
          </IconButton>
        </View>
      </View>
    </View>
  );
};

export default React.memo(TrackCard);

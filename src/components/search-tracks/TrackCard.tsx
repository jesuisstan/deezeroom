import { FC, memo, useCallback, useMemo } from 'react';
import { Image, View } from 'react-native';

import { AntDesign, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

import IconButton from '@/components/ui/buttons/IconButton';
import LineButton from '@/components/ui/buttons/LineButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Track } from '@/graphql/schema';
import { useFavoriteTracks } from '@/hooks/useFavoriteTracks';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { usePressAnimation } from '@/style/usePressAnimation';
import { getAlbumCover } from '@/utils/image-utils';

interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: (track: Track) => void;
}

const TrackCard: FC<TrackCardProps> = ({
  track,
  isPlaying = false,
  onPlay
}) => {
  const { theme } = useTheme();
  const { isTrackFavorite, toggleFavoriteTrack } = useFavoriteTracks();
  const { animatedStyle } = usePressAnimation({
    appearAnimation: true,
    appearDelay: 0,
    appearDuration: 800
  });

  // Memoize colors
  const colors = useMemo(
    () => ({
      textMain: themeColors[theme]['text-main'],
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
    <Animated.View style={animatedStyle}>
      <LineButton onPress={handlePlay}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          {albumCoverUrl && (
            <Image
              source={{ uri: albumCoverUrl }}
              className="h-16 w-16 rounded"
              resizeMode="cover"
            />
          )}
          <View className="flex-1">
            {/*<AnimatedTrackTitle
            title={track.title}
            textColor={themeColors[theme]['text-main']}
          />*/}
            <TextCustom
              type="semibold"
              size="m"
              color={isPlaying ? colors.primary : colors.textMain}
            >
              {track.title}
            </TextCustom>
            <TextCustom size="xs" color={colors.textSecondary}>
              {track.artist.name}
            </TextCustom>
          </View>

          <View className="flex-row items-center gap-2">
            {isPlaying && (
              <View className="animate-pulse">
                <AntDesign
                  name="play-square"
                  size={18}
                  color={colors.primary}
                />
              </View>
            )}
            {track.explicitLyrics && (
              <MaterialIcons
                name="explicit"
                size={18}
                color={colors.intentWarning}
              />
            )}
            <TextCustom size="xs" color={colors.textSecondary}>
              {formattedDuration}
            </TextCustom>

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
                  isCurrentTrackFavorite ? colors.primary : colors.textSecondary
                }
              />
            </IconButton>
          </View>
        </View>
      </LineButton>
    </Animated.View>
  );
};

export default memo(TrackCard);

import { FC, memo, useCallback, useMemo } from 'react';
import { Alert, GestureResponderEvent, Image, View } from 'react-native';

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
  onPress?: (track: Track) => void;
  onRemove?: (track: Track) => void;
}

const TrackCard: FC<TrackCardProps> = ({
  track,
  isPlaying = false,
  onPress,
  onRemove
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
  const handlePress = useCallback(() => {
    onPress?.(track);
  }, [onPress, track]);

  // Memoize handle toggle favorite
  const handleToggleFavorite = useCallback(
    async (event?: GestureResponderEvent) => {
      // Prevent parent LineButton from handling this press on web and native
      event?.stopPropagation?.();
      await toggleFavoriteTrack(track.id);
    },
    [toggleFavoriteTrack, track.id]
  );

  // Memoize handle remove
  const handleRemove = useCallback(
    (event?: GestureResponderEvent) => {
      event?.stopPropagation?.();

      Alert.alert(
        'Remove Track',
        `Are you sure you want to remove "${track.title}" by ${track.artist.name} from this playlist?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onRemove?.(track)
          }
        ]
      );
    },
    [onRemove, track]
  );

  return (
    <Animated.View style={animatedStyle}>
      <LineButton onPress={handlePress}>
        <View className="flex-1 flex-row items-center gap-3 px-4 py-2">
          {albumCoverUrl && (
            <Image
              source={{ uri: albumCoverUrl }}
              className="h-16 w-16 rounded"
              resizeMode="cover"
            />
          )}
          <View className="flex-1">
            <View className="flex-row items-center gap-1">
              <TextCustom
                type="semibold"
                size="m"
                color={isPlaying ? colors.primary : colors.textMain}
                numberOfLines={1}
                className="flex-1"
              >
                {track.title}
              </TextCustom>
              {isPlaying && (
                <View className="animate-pulse">
                  <AntDesign
                    name="play-square"
                    size={16}
                    color={colors.primary}
                  />
                </View>
              )}
              {track.explicitLyrics && (
                <MaterialIcons
                  name="explicit"
                  size={16}
                  color={colors.intentWarning}
                />
              )}
            </View>
            <View className="flex-row items-center gap-2">
              <TextCustom
                size="xs"
                color={colors.textSecondary}
                numberOfLines={1}
                className="flex-1"
              >
                {track.artist.name}
              </TextCustom>
              <TextCustom size="xs" color={colors.textSecondary}>
                {formattedDuration}
              </TextCustom>
            </View>
          </View>

          <View className="flex-row items-center">
            {/* Favorite Button or Remove Button */}
            {onRemove ? (
              <IconButton
                accessibilityLabel="Remove track from playlist"
                onPress={handleRemove}
                className="h-9 w-9"
              >
                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color={colors.intentError}
                />
              </IconButton>
            ) : (
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
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
              </IconButton>
            )}
          </View>
        </View>
      </LineButton>
    </Animated.View>
  );
};

export default memo(TrackCard);

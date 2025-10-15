import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  View
} from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePathname, useRouter } from 'expo-router';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useFavoriteTracks } from '@/hooks/useFavoriteTracks';
import { usePlayback } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const ANIMATION_DURATION = 220;

// TODO: PAINT THE MINIPLAYER WITH THE DOMINANT COLOR OF THE ALBUM COVER. STAS POSHLI PIT' PIVO
const MiniPlayer = () => {
  const router = useRouter();
  const pathname = usePathname();
  // Keep the mini player floating above the tab bar with a small gap.
  const baseBottomOffset = Platform.select({ ios: 72, default: 60 });

  const {
    queue,
    currentIndex,
    currentTrack,
    isPlaying,
    isLoading,
    togglePlayPause,
    playNext
  } = usePlayback();

  const { theme } = useTheme();
  const { isTrackFavorite, toggleFavoriteTrack } = useFavoriteTracks();

  const [isRendered, setIsRendered] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const isOnFullPlayer = pathname === '/player';
  const shouldShow = !!currentTrack && !isOnFullPlayer;

  const currentTrackId = currentTrack?.id;
  const isCurrentTrackFavorite = useMemo(() => {
    if (!currentTrackId) {
      return false;
    }
    return isTrackFavorite(currentTrackId);
  }, [currentTrackId, isTrackFavorite]);

  useEffect(() => {
    if (shouldShow) {
      setIsRendered(true);
    }

    Animated.timing(animation, {
      toValue: shouldShow ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished && !shouldShow) {
        setIsRendered(false);
      }
    });
  }, [animation, shouldShow]);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0]
  });

  const opacity = animation;

  const hasNext = useMemo(() => {
    if (currentIndex < 0) {
      return false;
    }
    return queue.slice(currentIndex + 1).some((track) => track.preview);
  }, [currentIndex, queue]);

  const handleOpenFullPlayer = () => {
    router.push('/player');
  };

  const handleToggleFavorite = useCallback(
    async (event: GestureResponderEvent) => {
      event.stopPropagation();
      if (!currentTrackId) {
        return;
      }
      await toggleFavoriteTrack(currentTrackId);
    },
    [currentTrackId, toggleFavoriteTrack]
  );

  if (!isRendered) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={shouldShow ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: baseBottomOffset ?? 60,
        transform: [{ translateY }],
        opacity
      }}
    >
      <View
        className="overflow-hidden rounded-3xl"
        style={{
          backgroundColor: themeColors[theme]['bg-secondary'],
          borderColor: themeColors[theme]['bg-tertiary'],
          borderWidth: 1,
          shadowColor: themeColors[theme]['bg-inverse'],
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open full player"
          onPress={handleOpenFullPlayer}
        >
          <View className="flex-row items-center gap-3 px-3 py-2">
            <IconButton
              accessibilityLabel={
                isPlaying ? 'Pause playback' : 'Start playback'
              }
              onPress={(event) => {
                event.stopPropagation();
                togglePlayPause();
              }}
              loading={isLoading}
              disabled={!currentTrack}
              className="h-11 w-11"
              backgroundColor={themeColors[theme]['primary']}
            >
              <MaterialCommunityIcons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color={themeColors[theme]['text-inverse']}
              />
            </IconButton>
            <View className="flex-1">
              <TextCustom
                type="semibold"
                size="s"
                className="w-full"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentTrack?.title ?? 'No track selected'}
              </TextCustom>
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
                className="w-full"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentTrack
                  ? [currentTrack.artist?.name, currentTrack.album?.title]
                      .filter(Boolean)
                      .join(' • ')
                  : 'Choose a song to start playback'}
              </TextCustom>
            </View>
            <IconButton
              accessibilityLabel={
                isCurrentTrackFavorite
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
              onPress={handleToggleFavorite}
              disabled={!currentTrackId}
              className="h-10 w-10"
            >
              <FontAwesome
                name={isCurrentTrackFavorite ? 'heart' : 'heart-o'}
                size={20}
                color={
                  isCurrentTrackFavorite
                    ? themeColors[theme]['intent-error']
                    : themeColors[theme]['text-main']
                }
              />
            </IconButton>
            <IconButton
              accessibilityLabel="Play next track"
              onPress={(event) => {
                event.stopPropagation();
                playNext();
              }}
              disabled={!hasNext || !currentTrack}
              className="h-10 w-10"
            >
              <MaterialCommunityIcons
                name="skip-next"
                size={22}
                color={themeColors[theme]['text-main']}
              />
            </IconButton>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
};

export default MiniPlayer;

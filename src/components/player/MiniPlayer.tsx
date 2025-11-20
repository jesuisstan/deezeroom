import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  View
} from 'react-native';

import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePathname, useRouter } from 'expo-router';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import useCompactPlayerControls from '@/hooks/useCompactPlayerControls';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const ANIMATION_DURATION = 220;

const MiniPlayer = () => {
  const router = useRouter();
  const pathname = usePathname();
  // Keep the mini player floating above the tab bar with a small gap.
  const baseBottomOffset = Platform.select({ ios: 80, default: 70 });

  const {
    currentTrack,
    currentTrackId,
    isPlaying,
    isLoading,
    togglePlayPause,
    playNext,
    isCurrentTrackFavorite,
    hasNext,
    toggleFavorite
  } = useCompactPlayerControls();

  const { theme } = useTheme();

  const [isRendered, setIsRendered] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const isOnFullPlayer = pathname === '/player';
  const shouldShow = !!currentTrack && !isOnFullPlayer;

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

  const handleOpenFullPlayer = () => {
    router.push('/player');
  };

  const handleToggleFavorite = useCallback(
    async (event: GestureResponderEvent) => {
      event.stopPropagation();
      await toggleFavorite();
    },
    [toggleFavorite]
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
        bottom: baseBottomOffset ?? 70,
        transform: [{ translateY }],
        opacity
      }}
    >
      <View
        className="overflow-hidden rounded-3xl"
        style={{
          backgroundColor: themeColors[theme]['bg-secondary'],
          shadowColor: themeColors[theme]['bg-inverse'],
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
          height: MINI_PLAYER_HEIGHT,
          justifyContent: 'center'
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open full player"
          onPress={handleOpenFullPlayer}
        >
          <View className="flex-row items-center gap-3 px-2 py-2">
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
              <View className="flex-row items-center gap-2">
                {/* Track title */}
                <TextCustom
                  type="semibold"
                  size="s"
                  className="flex-shrink"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentTrack?.title ?? 'No track selected'}
                </TextCustom>
                {/* Explicit lyrics icon */}
                {currentTrack?.explicitLyrics && (
                  <MaterialIcons
                    name="explicit"
                    size={15}
                    color={themeColors[theme]['intent-warning']}
                  />
                )}
              </View>
              {/* Artist and album name */}
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
                    ? themeColors[theme]['primary']
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

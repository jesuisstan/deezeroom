import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  Platform,
  Pressable,
  View
} from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
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
  const [isDismissed, setIsDismissed] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const swipeTranslateX = useRef(new Animated.Value(0)).current;

  const isOnFullPlayer = pathname === '/player';
  const shouldShow = !!currentTrack && !isOnFullPlayer && !isDismissed;

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

  useEffect(() => {
    if (shouldShow) {
      swipeTranslateX.setValue(0);
    }
  }, [shouldShow, swipeTranslateX]);

  useEffect(() => {
    if (!currentTrackId) {
      return;
    }
    setIsDismissed(false);
  }, [currentTrackId]);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0]
  });

  const opacity = animation;

  const handleDismissMini = useCallback(() => {
    Animated.timing(swipeTranslateX, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true
    }).start(() => {
      swipeTranslateX.setValue(0);
      setIsDismissed(true);
    });
  }, [swipeTranslateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (gestureState.dx <= 0) {
            return false;
          }
          const horizontalSwipe =
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          return horizontalSwipe && gestureState.dx > 12;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx >= 0) {
            swipeTranslateX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldDismiss = gestureState.dx > 80 || gestureState.vx > 0.4;
          if (shouldDismiss) {
            handleDismissMini();
            return;
          }
          Animated.spring(swipeTranslateX, {
            toValue: 0,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(swipeTranslateX, {
            toValue: 0,
            useNativeDriver: true
          }).start();
        }
      }),
    [handleDismissMini, swipeTranslateX]
  );

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
      {...panResponder.panHandlers}
      pointerEvents={shouldShow ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: baseBottomOffset ?? 70,
        transform: [{ translateY }, { translateX: swipeTranslateX }],
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

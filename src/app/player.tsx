import { useCallback, useEffect, useMemo } from 'react';
import { PanResponder, Platform, View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import PlayerArtwork from '@/components/player/PlayerArtwork';
import ProgressBar from '@/components/player/ProgressBar';
import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useFavoriteTracks } from '@/hooks/useFavoriteTracks';
import {
  usePlaybackActions,
  usePlaybackState,
  usePlaybackStatus
} from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { getAlbumCover } from '@/utils/image-utils';

const PlayerScreen = () => {
  console.count('PlayerScreen render');
  const router = useRouter();
  const { theme } = useTheme();
  const { isTrackFavorite, toggleFavoriteTrack } = useFavoriteTracks();

  // Split into three separate hooks to minimize re-renders
  // ProgressBar will handle status internally
  const { queue, currentTrack, currentIndex } = usePlaybackState();
  const { isPlaying, isLoading, error } = usePlaybackStatus();
  const { playNext, playPrevious, togglePlayPause } = usePlaybackActions();

  useEffect(() => {
    console.log('✅ PlayerScreen mounted');

    return () => {
      console.log('❌ PlayerScreen unmounted');
      console.countReset('🎬 PlayerScreen render');
    };
  }, []);

  const currentTrackId = currentTrack?.id;
  const isCurrentTrackFavorite = useMemo(() => {
    if (!currentTrackId) {
      return false;
    }
    return isTrackFavorite(currentTrackId);
  }, [currentTrackId, isTrackFavorite]);

  const handleToggleFavorite = useCallback(async () => {
    if (!currentTrackId) {
      return;
    }
    await toggleFavoriteTrack(currentTrackId);
  }, [currentTrackId, toggleFavoriteTrack]);

  const hasPrevious =
    currentIndex > 0 &&
    queue.slice(0, currentIndex).some((track) => track.preview);
  const hasNext =
    currentIndex >= 0 &&
    queue.slice(currentIndex + 1).some((track) => track.preview);

  // Get album cover image (use xl for web, big for mobile)
  const imageSize = Platform.OS === 'web' ? 'xl' : 'big';
  const albumCoverUrl = currentTrack?.album
    ? getAlbumCover(currentTrack.album, imageSize)
    : undefined;

  const artworkSource = useMemo(
    () =>
      albumCoverUrl
        ? { uri: albumCoverUrl }
        : require('@/assets/images/logo/logo-heart-transparent.png'),
    [albumCoverUrl]
  );

  const dismissPlayer = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const { dx, dy } = gestureState;
          const isVerticalSwipe = Math.abs(dy) > Math.abs(dx) && dy > 12;
          return isVerticalSwipe;
        },
        onPanResponderRelease: (_, gestureState) => {
          const { dy, vy } = gestureState;
          const enoughDistance = dy > 80;
          const enoughVelocity = vy > 0.6;
          if (enoughDistance || enoughVelocity) {
            scheduleOnRN(dismissPlayer);
          }
        }
      }),
    [dismissPlayer]
  );

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top', 'bottom']}
      {...swipeResponder.panHandlers}
    >
      <LinearGradient
        colors={[
          themeColors[theme]['bg-main'],
          themeColors[theme]['bg-secondary']
        ]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="flex-1 gap-6 px-6 py-6">
          <View className="flex-row items-center justify-between">
            <IconButton
              accessibilityLabel="Minimize player"
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={28}
                color={themeColors[theme]['text-main']}
              />
            </IconButton>
            <View className="flex-1 items-center px-4">
              <TextCustom
                type="subtitle"
                size="xl"
                className="w-full text-center"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                MIX
              </TextCustom>
              <TextCustom
                type="semibold"
                size="s"
                color={themeColors[theme]['text-secondary']}
                className="w-full text-center"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentTrack?.title ?? 'No track selected'}
              </TextCustom>
            </View>
            <View style={{ width: 48 }} />
          </View>

          <View className="flex-1 gap-6">
            <PlayerArtwork
              artworkSource={artworkSource}
              albumCoverUrl={albumCoverUrl}
              albumTitle={currentTrack?.album?.title}
            />

            <View className="flex-row items-center justify-between">
              <IconButton
                accessibilityLabel="Share track (coming soon)"
                className="h-12 w-12"
              >
                <FontAwesome
                  name="share-alt"
                  size={24}
                  color={themeColors[theme]['text-secondary']}
                />
              </IconButton>
              <IconButton
                accessibilityLabel={
                  isCurrentTrackFavorite
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
                onPress={handleToggleFavorite}
                disabled={!currentTrackId}
                className="h-12 w-12"
              >
                <FontAwesome
                  name={isCurrentTrackFavorite ? 'heart' : 'heart-o'}
                  size={24}
                  color={
                    isCurrentTrackFavorite
                      ? themeColors[theme]['intent-error']
                      : themeColors[theme]['text-secondary']
                  }
                />
              </IconButton>
            </View>

            {error && (
              <View className="bg-intent-error/10 rounded-2xl px-4 py-3">
                <TextCustom
                  size="s"
                  color={themeColors[theme]['intent-error']}
                  className="text-center"
                >
                  {error}
                </TextCustom>
              </View>
            )}

            <View className="gap-3">
              <ProgressBar
                theme={theme}
                trackDuration={currentTrack?.duration}
              />
              <View className="w-full items-center gap-1 px-4">
                <TextCustom
                  type="title"
                  size="3xl"
                  className="w-full text-center"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentTrack?.title ?? 'Start playing a track'}
                </TextCustom>
                <TextCustom
                  type="semibold"
                  color={themeColors[theme]['text-secondary']}
                  className="w-full text-center"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentTrack
                    ? [currentTrack.artist?.name, currentTrack.album?.title]
                        .filter(Boolean)
                        .join(' - ') || 'Select a track from the search'
                    : 'Select a track from the search'}
                </TextCustom>
              </View>
            </View>
          </View>

          <View className="flex-row items-center justify-around">
            <IconButton
              accessibilityLabel="Play previous track"
              onPress={playPrevious}
              disabled={!hasPrevious || !currentTrack}
              className="h-14 w-14"
            >
              <MaterialCommunityIcons
                name="skip-previous"
                size={32}
                color={themeColors[theme]['text-main']}
              />
            </IconButton>
            <IconButton
              accessibilityLabel="Play or pause"
              onPress={togglePlayPause}
              className="h-16 w-16"
              backgroundColor={themeColors[theme]['primary']}
              loading={isLoading}
              disabled={queue.length === 0}
            >
              <MaterialCommunityIcons
                name={isPlaying ? 'pause' : 'play'}
                size={38}
                color={themeColors[theme]['text-inverse']}
              />
            </IconButton>
            <IconButton
              accessibilityLabel="Play next track"
              onPress={playNext}
              disabled={!hasNext || !currentTrack}
              className="h-14 w-14"
            >
              <MaterialCommunityIcons
                name="skip-next"
                size={32}
                color={themeColors[theme]['text-main']}
              />
            </IconButton>
          </View>

          <View className="items-center gap-2">
            <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
              {queue.length > 0
                ? `Track ${currentIndex + 1} of ${queue.length}`
                : 'Search for tracks to start playback'}
            </TextCustom>
            <TextCustom
              size="xs"
              color={themeColors[theme]['text-secondary']}
              className="opacity-60"
            >
              Queue management is coming soon
            </TextCustom>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default PlayerScreen;

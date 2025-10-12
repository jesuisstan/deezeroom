import { Image, View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { usePlayback } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const PlayerScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    currentTrack,
    queue,
    currentIndex,
    status,
    isPlaying,
    isLoading,
    error,
    playNext,
    playPrevious,
    togglePlayPause
  } = usePlayback();

  const formatTime = (valueInSeconds: number) => {
    const totalSeconds = Number.isFinite(valueInSeconds)
      ? Math.max(0, Math.floor(valueInSeconds))
      : 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentSeconds = status?.currentTime ?? 0;
  const durationSeconds =
    status?.duration && status.duration > 0
      ? status.duration
      : (currentTrack?.duration ?? 0);
  const progress = durationSeconds
    ? Math.min(currentSeconds / durationSeconds, 1)
    : 0;
  const progressPercent = `${Math.max(0, progress) * 100}%`;

  const hasPrevious =
    currentIndex > 0 &&
    queue.slice(0, currentIndex).some((track) => track.preview);
  const hasNext =
    currentIndex >= 0 &&
    queue.slice(currentIndex + 1).some((track) => track.preview);

  const artworkSource = currentTrack?.album.cover
    ? { uri: currentTrack.album.cover }
    : require('@/assets/images/logo/logo-heart-transparent.png');

  return (
    <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
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
            <View className="flex-1 items-center justify-center">
              <View className="aspect-square w-full overflow-hidden rounded-3xl bg-bg-secondary">
                <Image
                  source={artworkSource}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode={currentTrack?.album.cover ? 'cover' : 'contain'}
                  accessibilityLabel={
                    currentTrack
                      ? `${currentTrack.album.title} cover art`
                      : 'Default cover art'
                  }
                />
              </View>
            </View>

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
                accessibilityLabel="Like track (coming soon)"
                className="h-12 w-12"
              >
                <FontAwesome
                  name="heart-o"
                  size={24}
                  color={themeColors[theme]['text-secondary']}
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
              <View className="flex-row justify-between">
                <TextCustom
                  size="xs"
                  color={themeColors[theme]['text-secondary']}
                >
                  {formatTime(currentSeconds)}
                </TextCustom>
                <TextCustom
                  size="xs"
                  color={themeColors[theme]['text-secondary']}
                >
                  {formatTime(durationSeconds)}
                </TextCustom>
              </View>
              <View className="h-2 rounded-full bg-bg-tertiary">
                <View
                  className="h-2 rounded-full"
                  style={{
                    width: progressPercent,
                    backgroundColor: themeColors[theme]['primary']
                  }}
                />
              </View>
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

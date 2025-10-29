import { useMemo } from 'react';
import { Image, Platform, View } from 'react-native';

import { FontAwesome } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import ProgressBar from '@/components/player/ProgressBar';
import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import useCompactPlayerControls from '@/hooks/useCompactPlayerControls';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { getAlbumCover } from '@/utils/image-utils';

const WEB_BOTTOM_OFFSET = 68;
const WEB_HORIZONTAL_PADDING = 28;

const WebPlayerBar = () => {
  const { theme } = useTheme();

  const {
    currentTrack,
    currentTrackId,
    isPlaying,
    isLoading,
    togglePlayPause,
    playNext,
    playPrevious,
    isCurrentTrackFavorite,
    hasNext,
    hasPrevious,
    toggleFavorite
  } = useCompactPlayerControls();

  const albumCoverUrl = currentTrack?.album
    ? getAlbumCover(currentTrack.album, 'medium')
    : undefined;

  const artworkSource = useMemo(
    () =>
      albumCoverUrl
        ? { uri: albumCoverUrl }
        : require('@/assets/images/logo/logo-heart-transparent.png'),
    [albumCoverUrl]
  );

  const shouldRender = Platform.OS === 'web' && !!currentTrack;
  if (!shouldRender) {
    return null;
  }

  const track = currentTrack!;

  const handleToggleFavorite = async () => {
    await toggleFavorite();
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'fixed',
        bottom: WEB_BOTTOM_OFFSET,
        left: 0,
        right: 0,
        zIndex: 30,
        alignItems: 'center',
        paddingHorizontal: WEB_HORIZONTAL_PADDING
      }}
    >
      <View style={{ width: '100%', maxWidth: 1120 }}>
        <View
          className="flex-row items-center"
          style={{
            backgroundColor: themeColors[theme]['bg-secondary'],
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 4,
            shadowColor: themeColors[theme]['bg-inverse'],
            shadowOpacity: 0.14,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            minHeight: 32
          }}
        >
          <View
            className="flex-row items-center gap-3"
            style={{
              flexBasis: 0,
              flexGrow: 1,
              flexShrink: 1,
              minWidth: 220
            }}
          >
            <View
              className="flex-row items-center gap-3"
              style={{ flexShrink: 1, flexGrow: 1 }}
            >
              <Image
                source={artworkSource}
                style={{
                  height: 32,
                  width: 32,
                  borderRadius: 8,
                  backgroundColor: themeColors[theme]['bg-tertiary']
                }}
                resizeMode="cover"
              />
              <View style={{ flexShrink: 1 }}>
                <TextCustom
                  type="semibold"
                  size="s"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {track.title}
                </TextCustom>
                {track.artist?.name ? (
                  <TextCustom
                    size="2xs"
                    color={themeColors[theme]['text-secondary']}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {track.artist.name}
                  </TextCustom>
                ) : null}
              </View>
            </View>
            <View>
              <IconButton
                accessibilityLabel={
                  isCurrentTrackFavorite
                    ? 'Remove from favorites'
                    : 'Add to favorites'
                }
                onPress={handleToggleFavorite}
                disabled={!currentTrackId}
                className="h-8 w-8"
              >
                <FontAwesome
                  name={isCurrentTrackFavorite ? 'heart' : 'heart-o'}
                  size={16}
                  color={
                    isCurrentTrackFavorite
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-main']
                  }
                />
              </IconButton>
            </View>
          </View>

          <View
            className="items-center"
            style={{
              flexBasis: 0,
              flexGrow: 1,
              flexShrink: 1,
              maxWidth: 460,
              gap: 4
            }}
          >
            <View className="flex-row items-center justify-center gap-3">
              <IconButton
                accessibilityLabel="Play previous track"
                onPress={playPrevious}
                disabled={!hasPrevious}
                className="h-8 w-8"
              >
                <MaterialCommunityIcons
                  name="skip-previous"
                  size={18}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>
              <IconButton
                accessibilityLabel={
                  isPlaying ? 'Pause playback' : 'Start playback'
                }
                onPress={togglePlayPause}
                loading={isLoading}
                className="h-9 w-9"
                backgroundColor={themeColors[theme]['primary']}
              >
                <MaterialCommunityIcons
                  name={isPlaying ? 'pause' : 'play'}
                  size={20}
                  color={themeColors[theme]['text-inverse']}
                />
              </IconButton>
              <IconButton
                accessibilityLabel="Play next track"
                onPress={playNext}
                disabled={!hasNext}
                className="h-8 w-8"
              >
                <MaterialCommunityIcons
                  name="skip-next"
                  size={18}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>
            </View>
            <View style={{ width: '100%', maxWidth: 300 }}>
              <ProgressBar
                theme={theme}
                trackDuration={track.duration}
                layout="inline"
              />
            </View>
          </View>

          <View
            className="flex-row items-center justify-end"
            style={{
              flexBasis: 0,
              flexGrow: 1,
              flexShrink: 1,
              minWidth: 220
            }}
          >
            <IconButton
              accessibilityLabel="Share track (coming soon)"
              className="h-8 w-8"
            >
              <FontAwesome
                name="share-alt"
                size={14}
                color={themeColors[theme]['text-secondary']}
              />
            </IconButton>
          </View>
        </View>
      </View>
    </View>
  );
};

export default WebPlayerBar;

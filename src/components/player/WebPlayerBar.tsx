import { useMemo } from 'react';
import { Image, Platform, View, useWindowDimensions } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import ProgressBar from '@/components/player/ProgressBar';
import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import useCompactPlayerControls from '@/hooks/useCompactPlayerControls';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { getAlbumCover } from '@/utils/image-utils';

const WEB_BOTTOM_OFFSET = 52;
const WEB_HORIZONTAL_PADDING = 28;

const WebPlayerBar = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions(); // Used to apply adaptive layout

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
    toggleFavorite,
    repeatMode,
    cycleRepeatMode
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
  if (!shouldRender) return null;

  const track = currentTrack!;

  // Adaptive modifiers for screens < 700px
  const isCompact = width < 700;

  // Dynamic sizes
  const coverSize = isCompact ? 45 : 55;
  const titleSize = isCompact ? 'xs' : 's';
  const artistSize = isCompact ? 'xxs' : 'xs';
  const controlIconSize = isCompact ? 24 : 30;
  const sideIconSize = isCompact ? 20 : 25;
  const horizontalGap = isCompact ? 6 : 12;

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
        paddingHorizontal: WEB_HORIZONTAL_PADDING,
        userSelect: 'none'
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
            minHeight: 32,
            gap: horizontalGap // adaptive spacing
          }}
        >
          {/* Left: Cover + Title */}
          <View
            className="flex-row items-center"
            style={{
              flexBasis: 0,
              flexGrow: 1,
              flexShrink: 1,
              minWidth: 0,
              gap: horizontalGap
            }}
          >
            <Image
              source={artworkSource}
              style={{
                height: coverSize,
                width: coverSize,
                borderRadius: 8,
                backgroundColor: themeColors[theme]['bg-tertiary']
              }}
              resizeMode="cover"
            />

            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <View
                className="flex-row items-center"
                style={{ gap: isCompact ? 2 : 4 }}
              >
                <TextCustom
                  type="semibold"
                  size={titleSize}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {track.title}
                </TextCustom>

                {track.explicitLyrics && (
                  <MaterialIcons
                    name="explicit"
                    size={isCompact ? 14 : 18}
                    color={themeColors[theme]['intent-warning']}
                  />
                )}
              </View>

              {track.artist?.name ? (
                <TextCustom
                  size={artistSize}
                  color={themeColors[theme]['text-secondary']}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {track.artist.name}
                </TextCustom>
              ) : null}
            </View>
          </View>

          {/* Center: Playback Controls + Progress */}
          <View
            className="items-center"
            style={{
              flexBasis: 0,
              flexGrow: 1,
              flexShrink: 1,
              minWidth: 0,
              paddingTop: 4,
              maxWidth: isCompact ? 320 : 460
            }}
          >
            <View
              className="flex-row items-center justify-center"
              style={{ gap: isCompact ? 6 : 14 }}
            >
              <IconButton
                accessibilityLabel="Play previous track"
                onPress={playPrevious}
                className="h-8 w-8"
              >
                <Ionicons
                  name="play-skip-back"
                  size={sideIconSize}
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
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={controlIconSize}
                  color={themeColors[theme]['primary']}
                />
              </IconButton>

              <IconButton
                accessibilityLabel="Play next track"
                onPress={playNext}
                disabled={!hasNext}
                className="h-8 w-8"
              >
                <Ionicons
                  name="play-skip-forward"
                  size={sideIconSize}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>
            </View>

            <View style={{ width: '100%', maxWidth: isCompact ? 220 : 300 }}>
              <ProgressBar
                theme={theme}
                trackDuration={track.duration}
                layout="inline"
              />
            </View>
          </View>

          {/* Right: Favorite + Repeat */}
          <View
            className="flex-row items-center justify-end"
            style={{
              flexBasis: 0,
              flexGrow: 1,
              flexShrink: 1,
              minWidth: 0,
              paddingLeft: isCompact ? 6 : 12,
              gap: isCompact ? 6 : 12
            }}
          >
            <IconButton
              accessibilityLabel={`Repeat mode: ${repeatMode}. Tap to change`}
              onPress={cycleRepeatMode}
              className="h-10 w-10"
            >
              <MaterialCommunityIcons
                name={
                  repeatMode === 'one'
                    ? 'repeat-once'
                    : repeatMode === 'off'
                      ? 'repeat-off'
                      : 'repeat'
                }
                size={sideIconSize}
                color={
                  repeatMode === 'off'
                    ? themeColors[theme]['text-main']
                    : themeColors[theme]['primary']
                }
              />
            </IconButton>

            <IconButton
              accessibilityLabel={
                isCurrentTrackFavorite
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
              onPress={async () => {
                // Comment: toggles favorite state
                await toggleFavorite();
              }}
              disabled={!currentTrackId}
              className="h-10 w-10"
            >
              <Ionicons
                name={isCurrentTrackFavorite ? 'heart' : 'heart-outline'}
                size={sideIconSize}
                color={
                  isCurrentTrackFavorite
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['text-main']
                }
              />
            </IconButton>
          </View>
        </View>
      </View>
    </View>
  );
};

export default WebPlayerBar;

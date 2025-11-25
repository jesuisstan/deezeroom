import { FC, memo } from 'react';
import { Image, View } from 'react-native';

import {
  AntDesign,
  MaterialCommunityIcons,
  MaterialIcons
} from '@expo/vector-icons';

import IconButton from '@/components/ui/buttons/IconButton';
import LineButton from '@/components/ui/buttons/LineButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Track } from '@/graphql/types-return';
import {
  usePlaybackActions,
  usePlaybackUI
} from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { getAlbumCover } from '@/utils/image-utils';

interface AddTrackCardProps {
  track: Track;
  isAdded: boolean;
  isPlaying: boolean;
  onPreview: (track: Track) => void;
  onToggleAdd: (track: Track) => void;
}

const AddTrackCard: FC<AddTrackCardProps> = ({
  track,
  isAdded,
  isPlaying,
  onPreview,
  onToggleAdd
}) => {
  const { theme } = useTheme();
  const { isPlaying: isGlobalPlaybackActive } = usePlaybackUI();
  const { pause: pauseGlobalPlayback } = usePlaybackActions();

  const formattedDuration = () => {
    const minutes = Math.floor(track.duration / 60);
    const remainingSeconds = track.duration % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const albumCoverUrl = getAlbumCover(track.album, 'small');

  const handlePress = () => {
    if (!track.preview) {
      return;
    }
    if (isGlobalPlaybackActive) {
      pauseGlobalPlayback();
    }
    onPreview(track);
  };

  const handleToggleAdd = (event?: any) => {
    // Prevent triggering parent LineButton press
    event?.stopPropagation?.();
    onToggleAdd(track);
  };

  return (
    <LineButton onPress={handlePress}>
      <View className="flex-1 flex-row items-center justify-between gap-2 px-4 py-2">
        <View
          id="track-info-group"
          className="flex-1 flex-row items-center gap-4"
        >
          {albumCoverUrl && (
            <Image
              source={{ uri: albumCoverUrl }}
              className="h-16 w-16 rounded"
              resizeMode="cover"
            />
          )}
          <View className="flex-1">
            <View className="mr-4 flex-row items-center gap-2">
              <TextCustom
                type="semibold"
                size="m"
                numberOfLines={1}
                color={
                  isPlaying
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['text-main']
                }
              >
                {track.title}
              </TextCustom>
              {track.explicitLyrics && (
                <MaterialIcons
                  name="explicit"
                  size={18}
                  color={themeColors[theme]['intent-warning']}
                />
              )}
              {isPlaying && (
                <View className="animate-pulse">
                  <AntDesign
                    name="play-square"
                    size={18}
                    color={themeColors[theme]['primary']}
                  />
                </View>
              )}
            </View>
            <View className="mr-4 flex-row items-center gap-2">
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
                numberOfLines={1}
              >
                {track.artist.name}
              </TextCustom>
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                •
              </TextCustom>
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                {formattedDuration()}
              </TextCustom>
            </View>
          </View>
        </View>

        <View id="action-buttons-group" className="flex-row items-center gap-2">
          {/* Add/Remove button */}
          <IconButton
            accessibilityLabel={
              isAdded ? 'Remove from playlist' : 'Add to playlist'
            }
            onPress={handleToggleAdd}
            className="h-9 w-9"
          >
            <MaterialCommunityIcons
              name={isAdded ? 'check-circle' : 'music-note-plus'}
              size={20}
              color={
                isAdded
                  ? themeColors[theme]['primary']
                  : themeColors[theme]['text-secondary']
              }
            />
          </IconButton>
        </View>
      </View>
    </LineButton>
  );
};

export default memo(AddTrackCard);

import { FC } from 'react';
import { Image, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { PlayedTrack } from '@/utils/firebase/firebase-service-events';

interface PlayedTrackCardProps {
  playedTrack: PlayedTrack;
}

const PlayedTrackCard: FC<PlayedTrackCardProps> = ({ playedTrack }) => {
  const { theme } = useTheme();

  const formatDate = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View
      className="mb-2 flex-row items-center gap-3 rounded-lg border p-3"
      style={{
        backgroundColor: themeColors[theme]['bg-secondary'],
        borderColor: themeColors[theme]['border']
      }}
    >
      {/* Album cover */}
      {playedTrack.albumCover ? (
        <Image
          source={{ uri: playedTrack.albumCover }}
          className="h-12 w-12 rounded"
        />
      ) : (
        <View
          className="h-12 w-12 items-center justify-center rounded"
          style={{ backgroundColor: themeColors[theme]['bg-tertiary'] }}
        >
          <MaterialCommunityIcons
            name="music"
            size={24}
            color={themeColors[theme]['text-secondary']}
          />
        </View>
      )}

      {/* Track info */}
      <View className="flex-1">
        <TextCustom type="semibold" numberOfLines={1} ellipsizeMode="tail">
          {playedTrack.title}
        </TextCustom>
        <TextCustom
          size="s"
          color={themeColors[theme]['text-secondary']}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {playedTrack.artist}
        </TextCustom>
        <View className="mt-1 flex-row items-center gap-2">
          <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
            {formatDate(playedTrack.playedAt)}
          </TextCustom>
          <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
            •
          </TextCustom>
          <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
            {formatDuration(playedTrack.duration)}
          </TextCustom>
          <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
            •
          </TextCustom>
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons
              name="arrow-up-bold"
              size={12}
              color={themeColors[theme]['primary']}
            />
            <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
              {playedTrack.voteCount}
            </TextCustom>
          </View>
        </View>
      </View>

      {/* Skipped badge */}
      {playedTrack.skipped && (
        <View
          className="rounded px-2 py-1"
          style={{
            backgroundColor: themeColors[theme]['intent-warning'] + '33'
          }}
        >
          <TextCustom
            size="xs"
            type="semibold"
            color={themeColors[theme]['intent-warning']}
          >
            Skipped
          </TextCustom>
        </View>
      )}
    </View>
  );
};

export default PlayedTrackCard;

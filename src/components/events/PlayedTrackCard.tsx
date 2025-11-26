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

  return (
    <View
      className="flex-row items-center gap-3 rounded-lg border px-4 py-2"
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
      </View>

      {/* Vote count */}
      <View className="flex-row items-center gap-1">
        <MaterialCommunityIcons
          name="vote"
          size={16}
          color={
            playedTrack.voteCount > 0
              ? themeColors[theme]['primary']
              : themeColors[theme]['text-secondary']
          }
        />
        <TextCustom
          size="xs"
          color={
            playedTrack.voteCount > 0
              ? themeColors[theme]['primary']
              : themeColors[theme]['text-secondary']
          }
          type="semibold"
        >
          {playedTrack.voteCount}
        </TextCustom>
      </View>
    </View>
  );
};

export default PlayedTrackCard;

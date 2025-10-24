import React from 'react';
import { Dimensions, View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface InfoTabProps {
  playlist: Playlist;
}

const InfoTab: React.FC<InfoTabProps> = ({ playlist }) => {
  const { theme } = useTheme();
  const { width } = Dimensions.get('window');

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatUpdatedDate = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  return (
    <View style={{ width, height: 200, padding: 16 }}>
      {/* Description Section */}
      <View style={{ marginBottom: 16 }}>
        <TextCustom
          size="m"
          color={
            themeColors[theme as keyof typeof themeColors]['text-secondary']
          }
          className="text-center"
        >
          {playlist.description || 'No description available'}
        </TextCustom>
      </View>

      {/* Stats Section */}
      <View className="flex-row justify-around">
        <View className="items-center">
          <TextCustom
            type="bold"
            size="l"
            color={themeColors[theme as keyof typeof themeColors]['text-main']}
          >
            {playlist.trackCount}
          </TextCustom>
          <TextCustom
            size="s"
            color={
              themeColors[theme as keyof typeof themeColors]['text-secondary']
            }
          >
            Tracks
          </TextCustom>
        </View>

        <View className="items-center">
          <TextCustom
            type="bold"
            size="l"
            color={themeColors[theme as keyof typeof themeColors]['text-main']}
          >
            {formatDuration(playlist.totalDuration)}
          </TextCustom>
          <TextCustom
            size="s"
            color={
              themeColors[theme as keyof typeof themeColors]['text-secondary']
            }
          >
            Length
          </TextCustom>
        </View>

        <View className="items-center">
          <TextCustom
            type="bold"
            size="l"
            color={themeColors[theme as keyof typeof themeColors]['text-main']}
          >
            {formatUpdatedDate(playlist.updatedAt)}
          </TextCustom>
          <TextCustom
            size="s"
            color={
              themeColors[theme as keyof typeof themeColors]['text-secondary']
            }
          >
            Updated
          </TextCustom>
        </View>
      </View>
    </View>
  );
};

export default InfoTab;

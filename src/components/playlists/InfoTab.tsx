import React from 'react';
import { View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface InfoTabProps {
  playlist: Playlist;
}

const InfoTab: React.FC<InfoTabProps> = ({ playlist }) => {
  const { theme } = useTheme();

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'number' || typeof value === 'string') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const formatUpdatedDate = (value: any): string => {
    const date = toDate(value);
    if (!date) return '—';
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60)));
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  return (
    <View className="h-full w-full flex-1 items-start justify-start gap-4 p-4">
      {/* Description Section */}
      <TextCustom
        size="m"
        color={
          playlist.description
            ? themeColors[theme]['text-main']
            : themeColors[theme]['text-secondary']
        }
      >
        {playlist.description || 'No description provided'}
      </TextCustom>

      {/* Stats Section */}
      <View className="flex-col items-start justify-start gap-4">
        <View className="items-start justify-start">
          <TextCustom
            type="bold"
            size="m"
            color={themeColors[theme as keyof typeof themeColors]['text-main']}
          >
            Tracks
          </TextCustom>
          <TextCustom
            size="m"
            color={
              themeColors[theme as keyof typeof themeColors]['text-secondary']
            }
          >
            {playlist.trackCount}
          </TextCustom>
        </View>

        <View className="items-start justify-start">
          <TextCustom
            type="bold"
            size="m"
            color={themeColors[theme]['text-main']}
          >
            Length
          </TextCustom>
          <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
            {formatDuration(playlist.totalDuration)}
          </TextCustom>
        </View>

        <View className="items-start justify-start">
          <TextCustom
            type="bold"
            size="m"
            color={themeColors[theme]['text-main']}
          >
            Updated
          </TextCustom>
          <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
            {formatUpdatedDate(playlist.updatedAt)}
          </TextCustom>
        </View>
      </View>
    </View>
  );
};

export default InfoTab;

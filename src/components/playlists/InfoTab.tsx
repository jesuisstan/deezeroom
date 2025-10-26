import React, { useMemo } from 'react';
import { View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface InfoTabProps {
  playlist: Playlist;
}

const InfoTab: React.FC<InfoTabProps> = ({ playlist }) => {
  const { theme } = useTheme();

  const ownerParticipant = useMemo(() => {
    if (!playlist) return undefined;
    return (
      playlist.participants?.find((p) => p.role === 'owner') ||
      playlist.participants?.find((p) => p.userId === playlist.createdBy)
    );
  }, [playlist]);

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
    <View
      className="h-full w-full flex-1 gap-4 p-4"
      style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
    >
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
        <View className="w-full flex-row items-center justify-between gap-2">
          <View className="flex-1 items-start justify-start">
            <TextCustom
              type="bold"
              size="m"
              color={
                themeColors[theme as keyof typeof themeColors]['text-main']
              }
            >
              Created by
            </TextCustom>
            <TextCustom
              size="m"
              color={
                themeColors[theme as keyof typeof themeColors]['text-secondary']
              }
            >
              {ownerParticipant?.displayName ||
                ownerParticipant?.email ||
                'Owner'}
            </TextCustom>
          </View>

          <View className="flex-1 items-end justify-end">
            <TextCustom
              type="bold"
              size="m"
              color={themeColors[theme]['text-main']}
              className="text-right"
            >
              Updated
            </TextCustom>
            <TextCustom
              size="m"
              color={themeColors[theme]['text-secondary']}
              className="text-right"
            >
              {formatUpdatedDate(playlist.updatedAt)}
            </TextCustom>
          </View>
        </View>

        <View className="w-full flex-row items-center justify-between gap-2">
          <View className="flex-1 items-start justify-start">
            <TextCustom
              type="bold"
              size="m"
              color={
                themeColors[theme as keyof typeof themeColors]['text-main']
              }
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

          <View className="flex-1 items-end justify-end">
            <TextCustom
              type="bold"
              size="m"
              color={themeColors[theme]['text-main']}
              className="text-right"
            >
              Length
            </TextCustom>
            <TextCustom
              size="m"
              color={themeColors[theme]['text-secondary']}
              className="text-right"
            >
              {formatDuration(playlist.totalDuration)}
            </TextCustom>
          </View>
        </View>

        <View className="w-full flex-row items-center justify-between gap-2">
          <View className="flex-1 items-start justify-start">
            <TextCustom
              type="bold"
              size="m"
              color={themeColors[theme]['text-main']}
            >
              Visibility
            </TextCustom>
            <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
              {playlist.visibility === 'public' ? 'Public' : 'Private'}
            </TextCustom>
            <MaterialCommunityIcons
              name={playlist.visibility === 'public' ? 'earth' : 'lock'}
              size={18}
              color={themeColors[theme]['text-secondary']}
              className="mt-1"
            />
          </View>

          <View className="flex-1 items-end justify-end">
            <TextCustom
              type="bold"
              size="m"
              color={themeColors[theme]['text-main']}
              className="text-right"
            >
              Edit Permissions
            </TextCustom>
            <TextCustom
              size="m"
              color={themeColors[theme]['text-secondary']}
              className="text-right"
            >
              {playlist.editPermissions === 'everyone'
                ? 'All Can Edit'
                : 'Invited Only'}
            </TextCustom>
            <MaterialCommunityIcons
              name={
                playlist.editPermissions === 'everyone'
                  ? 'account-group'
                  : 'account-plus'
              }
              size={18}
              color={themeColors[theme]['text-secondary']}
              className="mt-1 text-right"
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default InfoTab;

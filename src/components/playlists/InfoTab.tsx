import { FC, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';
import { convertToDate } from '@/utils/general-utils';

interface InfoTabProps {
  playlist: Playlist;
}

const InfoTab: FC<InfoTabProps> = ({ playlist }) => {
  const { theme } = useTheme();

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formattedCreatedDate = useMemo(() => {
    if (!playlist) return '—';
    const date = convertToDate(playlist.createdAt);
    if (!date) return '—';
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [playlist]);

  // Current time state - updates every minute for relative time display
  const [currentMinute, setCurrentMinute] = useState(() =>
    Math.floor(Date.now() / 60000)
  );

  // Update current minute every minute (only when component is mounted)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinute(Math.floor(Date.now() / 60000));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Memoized formatted date - shows relative time for recent updates, actual time for older ones
  const formattedUpdatedDate = useMemo(() => {
    const date = convertToDate(playlist.updatedAt);
    if (!date) return '—';

    const dateMinute = Math.floor(date.getTime() / 60000);
    const diffInMinutes = currentMinute - dateMinute;
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // For very recent updates (< 60 minutes), show relative time
    if (diffInMinutes < 60) {
      if (diffInMinutes < 1) {
        // For updates less than 1 minute ago, show actual time
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return diffInMinutes === 1
        ? '1 minute ago'
        : `${diffInMinutes} minutes ago`;
    }

    // For updates less than 24 hours, show relative time
    if (diffInHours < 24) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    }

    // For older updates, show date and time
    if (diffInDays < 7) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }

    // For very old updates, show full date and time
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [currentMinute, playlist.updatedAt]);

  return (
    <ScrollView
      className="h-full w-full flex-1 select-none"
      style={{
        backgroundColor:
          playlist.visibility === 'public'
            ? themeColors[theme].primary + '20'
            : themeColors[theme]['intent-success'] + '20'
      }}
      contentContainerStyle={{
        padding: Platform.OS === 'web' ? 32 : 16,
        gap: 16
      }}
      showsVerticalScrollIndicator={true}
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
              Created
            </TextCustom>
            <TextCustom
              size="m"
              color={
                themeColors[theme as keyof typeof themeColors]['text-secondary']
              }
            >
              {/*{playlist.createdAt.toLocaleDateString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}*/}
              {formattedCreatedDate}
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
              {formattedUpdatedDate}
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
    </ScrollView>
  );
};

export default InfoTab;

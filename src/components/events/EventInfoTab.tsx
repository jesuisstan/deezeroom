import { FC } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Event } from '@/utils/firebase/firebase-service-events';

interface EventInfoTabProps {
  event: Event;
}

const EventInfoTab: FC<EventInfoTabProps> = ({ event }) => {
  const { theme } = useTheme();

  const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'number' || typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return 'Not set';
    return date.toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const startDate = toDate(event.startAt);
  const endDate = toDate(event.endAt);

  const formattedStart = formatDateTime(startDate);
  const formattedEnd = formatDateTime(endDate);

  const statusLabel = (() => {
    if (!startDate || !endDate) {
      return 'Unknown';
    }
    const now = Date.now();
    if (endDate.getTime() <= now) {
      return 'Ended';
    }
    if (startDate.getTime() > now) {
      return 'Upcoming';
    }
    return 'Live now';
  })();

  const visibilityLabel = event.visibility === 'public' ? 'Public' : 'Private';

  const votingDescription = (() => {
    switch (event.voteLicense) {
      case 'invited':
        return 'Only invited participants may vote.';
      default:
        return 'Any authenticated user may vote.';
    }
  })();

  const geofenceInfo = event.geofence
    ? event.geofence.locationName
      ? `${event.geofence.locationName} (${event.geofence.radiusMeters}m)`
      : `${event.geofence.radiusMeters}m radius`
    : 'No location restriction';

  return (
    <ScrollView
      className="h-full w-full flex-1 select-none"
      style={{
        backgroundColor:
          event.visibility === 'public'
            ? themeColors[theme].primary + '20'
            : themeColors[theme]['intent-success'] + '20'
      }}
      contentContainerStyle={{
        padding: Platform.OS === 'web' ? 32 : 16,
        gap: 16
      }}
      showsVerticalScrollIndicator
    >
      <TextCustom
        size="m"
        color={
          event.description
            ? themeColors[theme]['text-main']
            : themeColors[theme]['text-secondary']
        }
      >
        {event.description || 'No description provided.'}
      </TextCustom>

      <View className="w-full flex-row items-center justify-between gap-2">
        <View className="flex-1 items-start justify-start">
          <TextCustom
            type="bold"
            size="m"
            color={themeColors[theme]['text-main']}
          >
            Status
          </TextCustom>
          <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
            {statusLabel}
          </TextCustom>
        </View>

        <View className="flex-1 items-end justify-end">
          <TextCustom
            type="bold"
            size="m"
            color={themeColors[theme]['text-main']}
            className="text-right"
          >
            Visibility
          </TextCustom>
          <TextCustom
            size="m"
            color={themeColors[theme]['text-secondary']}
            className="text-right"
          >
            {visibilityLabel}
          </TextCustom>
        </View>
      </View>

      <View className="flex-col items-start justify-start gap-4">
        <View className="w-full flex-row items-center justify-between gap-2">
          <View className="flex-1 items-start justify-start">
            <TextCustom
              type="bold"
              size="m"
              color={themeColors[theme]['text-main']}
            >
              Start time
            </TextCustom>
            <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
              {formattedStart}
            </TextCustom>
          </View>

          <View className="flex-1 items-end justify-end">
            <TextCustom
              type="bold"
              size="m"
              color={themeColors[theme]['text-main']}
              className="text-right"
            >
              End time
            </TextCustom>
            <TextCustom
              size="m"
              color={themeColors[theme]['text-secondary']}
              className="text-right"
            >
              {formattedEnd}
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
              Voting license
            </TextCustom>
            <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
              {votingDescription}
            </TextCustom>
          </View>

          <View className="flex-1 items-end justify-end">
            <TextCustom
              type="bold"
              size="m"
              color={themeColors[theme]['text-main']}
              className="text-right"
            >
              Geofence
            </TextCustom>
            <TextCustom
              size="m"
              color={themeColors[theme]['text-secondary']}
              className="text-right"
            >
              {geofenceInfo}
            </TextCustom>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default EventInfoTab;

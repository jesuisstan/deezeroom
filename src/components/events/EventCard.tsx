import React from 'react';
import { Image, Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { usePressAnimation } from '@/style/usePressAnimation';
import { Event } from '@/utils/firebase/firebase-service-events';

interface EventCardProps {
  event: Event;
}

const COVER_SIZE = 96;

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    appearAnimation: true,
    appearDelay: 0,
    appearDuration: 800
  });

  const handlePress = () => {
    router.push(`/(tabs)/events/${event.id}` as any);
  };

  const formatSchedule = () => {
    if (!event.startAt || !event.endAt) {
      return { startText: 'Not set', endText: 'Not set' };
    }

    const startDate = new Date(event.startAt as any);
    const endDate = new Date(event.endAt as any);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { startText: 'Not set', endText: 'Not set' };
    }
    const timeZone = event.timezone || undefined;
    const sameDay = startDate.toDateString() === endDate.toDateString();

    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone
    });

    const timeFormatter = new Intl.DateTimeFormat(undefined, {
      timeStyle: 'short',
      timeZone
    });

    const startText = dateFormatter.format(startDate);
    const endText = sameDay
      ? timeFormatter.format(endDate)
      : dateFormatter.format(endDate);

    const timeZoneName = dateFormatter
      .formatToParts(startDate)
      .find((part) => part.type === 'timeZoneName')?.value;
    const tzSuffix = timeZoneName ? ` (${timeZoneName})` : '';

    return {
      startText: `${startText}${tzSuffix}`,
      endText: `${endText}${tzSuffix}`
    };
  };

  const getLocationText = () => {
    if (event.geofence?.locationName) {
      return event.geofence.locationName;
    }
    return 'No location restriction';
  };

  const renderCover = () => {
    if (event.coverImageUrl) {
      return (
        <Image
          source={{ uri: event.coverImageUrl }}
          style={{ width: COVER_SIZE, height: COVER_SIZE, borderRadius: 6 }}
          resizeMode="cover"
        />
      );
    }

    return (
      <View
        style={{
          width: COVER_SIZE,
          height: COVER_SIZE,
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            event.visibility === 'public'
              ? themeColors[theme].primary + '25'
              : themeColors[theme]['intent-success'] + '25'
        }}
      >
        <MaterialCommunityIcons
          name="party-popper"
          size={32}
          color={themeColors[theme]['primary']}
        />
      </View>
    );
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={null}
        style={{ width: '100%', marginBottom: 12 }}
      >
        <View className="flex-row items-center justify-between gap-4 rounded-md border border-border bg-bg-secondary px-4 py-3 shadow-sm">
          {renderCover()}

          <View className="flex-1 justify-between gap-2">
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons
                  name={event.visibility === 'public' ? 'earth' : 'lock'}
                  size={18}
                  color={themeColors[theme]['primary']}
                />
                <TextCustom
                  type="semibold"
                  size="l"
                  color={themeColors[theme]['text-main']}
                  numberOfLines={1}
                >
                  {event.name}
                </TextCustom>
              </View>

              <View className="gap-1">
                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons
                    name="calendar-start"
                    size={18}
                    color={themeColors[theme]['text-secondary']}
                    style={{ flexShrink: 0 }}
                  />
                  <View className="min-w-0 flex-1">
                    <TextCustom
                      size="xs"
                      color={themeColors[theme]['text-secondary']}
                      numberOfLines={1}
                    >
                      Start: {formatSchedule().startText}
                    </TextCustom>
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons
                    name="calendar-end"
                    size={18}
                    color={themeColors[theme]['text-secondary']}
                    style={{ flexShrink: 0 }}
                  />
                  <View className="min-w-0 flex-1">
                    <TextCustom
                      size="xs"
                      color={themeColors[theme]['text-secondary']}
                      numberOfLines={1}
                    >
                      End: {formatSchedule().endText}
                    </TextCustom>
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons
                    name={
                      event.geofence?.locationName
                        ? 'map-marker-radius'
                        : 'map-marker-off'
                    }
                    size={18}
                    color={themeColors[theme]['text-secondary']}
                    style={{ flexShrink: 0 }}
                  />
                  <View className="min-w-0 flex-1">
                    <TextCustom
                      size="xs"
                      color={themeColors[theme]['text-secondary']}
                      numberOfLines={2}
                    >
                      {getLocationText()}
                    </TextCustom>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default EventCard;

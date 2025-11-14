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
          backgroundColor: `${themeColors[theme]['primary']}25`
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
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: themeColors[theme]['bg-secondary'],
            borderRadius: 6,
            padding: 14,
            borderWidth: 1,
            borderColor: themeColors[theme].border,
            shadowColor: themeColors[theme]['bg-inverse'],
            shadowOpacity: 0.08,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            alignItems: 'stretch',
            gap: 14
          }}
        >
          {renderCover()}

          <View style={{ flex: 1, justifyContent: 'space-between', gap: 8 }}>
            <View style={{ gap: 6 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
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

              <View style={{ gap: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <MaterialCommunityIcons
                    name="calendar-start"
                    size={18}
                    color={themeColors[theme]['text-secondary']}
                  />
                  <TextCustom
                    size="xs"
                    color={themeColors[theme]['text-secondary']}
                    numberOfLines={1}
                  >
                    Start: {formatSchedule().startText}
                  </TextCustom>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <MaterialCommunityIcons
                    name="calendar-end"
                    size={18}
                    color={themeColors[theme]['text-secondary']}
                  />
                  <TextCustom
                    size="xs"
                    color={themeColors[theme]['text-secondary']}
                    numberOfLines={1}
                  >
                    End: {formatSchedule().endText}
                  </TextCustom>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <MaterialCommunityIcons
                    name={
                      event.geofence?.locationName
                        ? 'map-marker-radius'
                        : 'map-marker-off'
                    }
                    size={18}
                    color={themeColors[theme]['text-secondary']}
                  />
                  <TextCustom
                    size="xs"
                    color={themeColors[theme]['text-secondary']}
                    numberOfLines={1}
                  >
                    {getLocationText()}
                  </TextCustom>
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

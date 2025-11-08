import React from 'react';
import { Image, Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Event } from '@/utils/firebase/firebase-service-events';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const { theme } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    router.push(`/(tabs)/events/${event.id}` as any);
  };

  const renderCover = () => {
    if (event.coverImageUrl) {
      return (
        <Image
          source={{ uri: event.coverImageUrl }}
          style={{ width: '100%', height: 120, borderRadius: 12 }}
          resizeMode="cover"
        />
      );
    }

    return (
      <View
        style={{
          height: 120,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${themeColors[theme]['primary']}25`
        }}
      >
        <MaterialCommunityIcons
          name="music-circle"
          size={42}
          color={themeColors[theme]['primary']}
        />
      </View>
    );
  };

  const getVoteLicenseLabel = () => {
    switch (event.voteLicense) {
      case 'invited':
        return 'Invited votes only';
      case 'geofence':
        return 'Location based votes';
      default:
        return 'Everyone can vote';
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{ width: '100%', marginBottom: 12 }}
    >
      <View
        style={{
          backgroundColor: themeColors[theme]['bg-secondary'],
          borderRadius: 16,
          padding: 14,
          gap: 12,
          borderWidth: 1,
          borderColor: themeColors[theme].border,
          shadowColor: themeColors[theme]['bg-inverse'],
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 }
        }}
      >
        {renderCover()}

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons
              name={event.visibility === 'public' ? 'earth' : 'lock'}
              size={18}
              color={themeColors[theme]['primary']}
            />
            <TextCustom
              type="semibold"
              size="l"
              color={themeColors[theme]['text-main']}
            >
              {event.name}
            </TextCustom>
          </View>

          {event.description ? (
            <TextCustom
              size="s"
              numberOfLines={2}
              color={themeColors[theme]['text-secondary']}
            >
              {event.description}
            </TextCustom>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <MaterialCommunityIcons
                name="account-music"
                size={16}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                {event.trackCount || 0} tracks
              </TextCustom>
            </View>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <MaterialCommunityIcons
                name="vote"
                size={16}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                {getVoteLicenseLabel()}
              </TextCustom>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default EventCard;

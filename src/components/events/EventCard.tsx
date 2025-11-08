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

  const renderCover = () => {
    if (event.coverImageUrl) {
      return (
        <Image
          source={{ uri: event.coverImageUrl }}
          style={{ width: COVER_SIZE, height: COVER_SIZE, borderRadius: 12 }}
          resizeMode="cover"
        />
      );
    }

    return (
      <View
        style={{
          width: COVER_SIZE,
          height: COVER_SIZE,
          borderRadius: 12,
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
            borderRadius: 8,
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

              {event.description ? (
                <TextCustom
                  size="s"
                  numberOfLines={2}
                  color={themeColors[theme]['text-secondary']}
                >
                  {event.description}
                </TextCustom>
              ) : null}
            </View>

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
    </Animated.View>
  );
};

export default EventCard;

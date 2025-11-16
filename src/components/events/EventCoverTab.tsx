import React from 'react';
import { Image, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Event } from '@/utils/firebase/firebase-service-events';

interface EventCoverTabProps {
  event: Event;
}

const EventCoverTab: React.FC<EventCoverTabProps> = ({ event }) => {
  const { theme } = useTheme();

  return (
    <View style={{ width: '100%', aspectRatio: 1, overflow: 'hidden' }}>
      {event.coverImageUrl ? (
        <Image
          source={{ uri: event.coverImageUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: '100%',
            backgroundColor:
              event.visibility === 'public'
                ? themeColors[theme].primary + '20'
                : themeColors[theme]['intent-success'] + '20',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Image
            source={
              theme === 'dark'
                ? require('@/assets/images/logo/logo-ver-text-white-bg-transparent.png')
                : require('@/assets/images/logo/logo-ver-text-black-bg-transparent.png')
            }
            style={{
              maxHeight: '80%',
              width: 200,
              resizeMode: 'contain'
            }}
          />
        </View>
      )}
    </View>
  );
};

export default EventCoverTab;

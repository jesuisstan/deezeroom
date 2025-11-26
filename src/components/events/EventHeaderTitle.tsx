import React, { useEffect, useState } from 'react';

import { useGlobalSearchParams, useSegments } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Event, EventService } from '@/utils/firebase/firebase-service-events';

const EventHeaderTitle: React.FC = () => {
  const { theme } = useTheme();
  const segments = useSegments();
  const { id } = useGlobalSearchParams<{ id?: string }>();
  const [event, setEvent] = useState<Event | null>(null);

  // Only use id if we're on an event route
  const isEventRoute = (segments as string[]).includes('events');
  const eventId = isEventRoute ? id : null;

  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = EventService.subscribeToEvent(
      eventId,
      (updatedEvent) => {
        setEvent(updatedEvent);
      },
      () => {
        // On error, just show default title
        setEvent(null);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [eventId]);

  return (
    <TextCustom type="subtitle" color={themeColors[theme]['text-main']}>
      {event?.name || 'Event'}
    </TextCustom>
  );
};

export default EventHeaderTitle;

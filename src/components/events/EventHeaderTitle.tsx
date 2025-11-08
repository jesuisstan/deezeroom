import React, { useEffect, useState } from 'react';

import { useGlobalSearchParams } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Event, EventService } from '@/utils/firebase/firebase-service-events';

const EventHeaderTitle: React.FC = () => {
  const { theme } = useTheme();
  const { id } = useGlobalSearchParams<{ id?: string }>();
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = EventService.subscribeToEvent(id, (updatedEvent) => {
      setEvent(updatedEvent);
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

  return (
    <TextCustom type="subtitle" color={themeColors[theme]['text-main']}>
      {event?.name || 'Event'}
    </TextCustom>
  );
};

export default EventHeaderTitle;

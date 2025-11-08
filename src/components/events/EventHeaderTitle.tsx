import React, { useEffect, useState } from 'react';

import { useGlobalSearchParams } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const EventHeaderTitle: React.FC = () => {
  const { theme } = useTheme();
  const { id } = useGlobalSearchParams<{ id?: string }>();

  return (
    <TextCustom type="subtitle" color={themeColors[theme]['text-main']}>
      {event?.name || 'Event'}
    </TextCustom>
  );
};

export default EventHeaderTitle;

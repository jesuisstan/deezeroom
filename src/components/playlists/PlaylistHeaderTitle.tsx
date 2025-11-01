import React, { useEffect, useState } from 'react';

import { useGlobalSearchParams } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import {
  Playlist,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';

const PlaylistHeaderTitle: React.FC = () => {
  const { theme } = useTheme();
  const { id } = useGlobalSearchParams<{ id?: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    // Initial load
    const load = async () => {
      try {
        const data = await PlaylistService.getPlaylist(id);
        if (isMounted) setPlaylist(data);
      } catch {
        // swallow
      }
    };

    load();

    // Subscribe to real-time updates
    const unsubscribe = PlaylistService.subscribeToPlaylist(
      id,
      (updatedPlaylist) => {
        if (isMounted && updatedPlaylist) {
          setPlaylist(updatedPlaylist);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id]);

  return (
    <TextCustom type="subtitle" color={themeColors[theme]['text-main']}>
      {playlist?.name || 'Playlist'}
    </TextCustom>
  );
};

export default PlaylistHeaderTitle;

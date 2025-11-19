import React, { useEffect, useState } from 'react';

import { useGlobalSearchParams, useSegments } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import {
  Playlist,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';

const PlaylistHeaderTitle: React.FC = () => {
  const { theme } = useTheme();
  const segments = useSegments();
  const { id } = useGlobalSearchParams<{ id?: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  console.log('segments', segments);
  // Only use id if we're on a playlist route
  const isPlaylistRoute = (segments as string[]).includes('playlists');
  const playlistId = isPlaylistRoute ? id : null;

  useEffect(() => {
    if (!playlistId) return;

    let isMounted = true;

    // Initial load
    const load = async () => {
      try {
        const data = await PlaylistService.getPlaylist(playlistId);
        if (isMounted) setPlaylist(data);
      } catch {
        // swallow
      }
    };

    load();

    // Subscribe to real-time updates
    const unsubscribe = PlaylistService.subscribeToPlaylist(
      playlistId,
      (updatedPlaylist) => {
        if (!isMounted) return;
        if (updatedPlaylist) {
          setPlaylist(updatedPlaylist);
        } else {
          setPlaylist(null);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [playlistId]);

  return (
    <TextCustom type="subtitle" color={themeColors[theme]['text-main']}>
      {playlist?.name || 'Playlist'}
    </TextCustom>
  );
};

export default PlaylistHeaderTitle;

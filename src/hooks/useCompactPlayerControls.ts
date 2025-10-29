import { useCallback, useMemo } from 'react';

import { useFavoriteTracks } from '@/hooks/useFavoriteTracks';
import {
  usePlaybackActions,
  usePlaybackState,
  usePlaybackUI
} from '@/providers/PlaybackProvider';

const useCompactPlayerControls = () => {
  const { queue, currentTrack, currentIndex } = usePlaybackState();
  const { isPlaying, isLoading } = usePlaybackUI();
  const { togglePlayPause, playNext, playPrevious } = usePlaybackActions();
  const { isTrackFavorite, toggleFavoriteTrack } = useFavoriteTracks();

  const currentTrackId = currentTrack?.id ?? null;

  const isCurrentTrackFavorite = useMemo(() => {
    if (!currentTrackId) {
      return false;
    }
    return isTrackFavorite(currentTrackId);
  }, [currentTrackId, isTrackFavorite]);

  const hasPrevious = useMemo(() => {
    if (currentIndex <= 0) {
      return false;
    }
    return queue.slice(0, currentIndex).some((track) => track.preview);
  }, [currentIndex, queue]);

  const hasNext = useMemo(() => {
    if (currentIndex < 0) {
      return false;
    }
    return queue.slice(currentIndex + 1).some((track) => track.preview);
  }, [currentIndex, queue]);

  const handleToggleFavorite = useCallback(async () => {
    if (!currentTrackId) {
      return;
    }
    await toggleFavoriteTrack(currentTrackId);
  }, [currentTrackId, toggleFavoriteTrack]);

  return {
    queue,
    currentTrack,
    currentTrackId,
    currentIndex,
    isPlaying,
    isLoading,
    togglePlayPause,
    playNext,
    playPrevious,
    isCurrentTrackFavorite,
    hasNext,
    hasPrevious,
    toggleFavorite: handleToggleFavorite
  };
};

export default useCompactPlayerControls;

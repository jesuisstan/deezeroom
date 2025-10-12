import { useCallback, useMemo } from 'react';

import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useUser } from '@/providers/UserProvider';
import { UserService } from '@/utils/firebase/firebase-service-user';

export const useFavoriteTracks = () => {
  const { user, profile, updateProfile } = useUser();

  // Check if track is favorite
  const isTrackFavorite = useCallback(
    (trackId: string): boolean => {
      return profile?.favoriteTracks?.includes(trackId) || false;
    },
    [profile?.favoriteTracks]
  );

  // Toggle favorite status for a track
  const toggleFavoriteTrack = useCallback(
    async (trackId: string): Promise<boolean> => {
      if (!user || !profile) {
        Notifier.error('You must be logged in to manage favorites');
        return false;
      }

      try {
        const result = await UserService.toggleFavoriteTrack(user.uid, trackId);
        if (result.success) {
          // Update profile optimistically
          const updatedFavorites = result.isFavorite
            ? [...(profile.favoriteTracks || []), trackId]
            : (profile.favoriteTracks || []).filter((id) => id !== trackId);

          await updateProfile({ favoriteTracks: updatedFavorites });
          Notifier.success(result.message || 'Favorites updated');
          return result.isFavorite;
        } else {
          Notifier.error(result.message || 'Failed to update favorites');
          return false;
        }
      } catch (error) {
        Logger.error('Error toggling favorite:', error, '🔍 useFavoriteTracks');
        Notifier.error('Failed to update favorites');
        return false;
      }
    },
    [user, profile, updateProfile]
  );

  // Get all favorite tracks
  const favoriteTracks = useMemo(() => {
    return profile?.favoriteTracks || [];
  }, [profile?.favoriteTracks]);

  // Check if multiple tracks are favorites
  const areTracksFavorites = useCallback(
    (trackIds: string[]): boolean[] => {
      return trackIds.map((id) => isTrackFavorite(id));
    },
    [isTrackFavorite]
  );

  // Get count of favorite tracks
  const favoriteTracksCount = useMemo(() => {
    return favoriteTracks.length;
  }, [favoriteTracks]);

  return {
    isTrackFavorite,
    toggleFavoriteTrack,
    favoriteTracks,
    areTracksFavorites,
    favoriteTracksCount
  };
};

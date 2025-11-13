import { useCallback, useMemo } from 'react';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import { useUser } from '@/providers/UserProvider';
import { UserService } from '@/utils/firebase/firebase-service-user';

export const useFavoriteTracks = () => {
  const { user, profile, updateProfile } = useUser();

  // Check if a track is favorite
  const isTrackFavorite = useCallback(
    (trackId: string): boolean => {
      return profile?.favoriteTracks?.includes(trackId) || false;
    },
    [profile?.favoriteTracks]
  );

  // Add track to favorites
  const addToFavorites = useCallback(
    async (trackId: string): Promise<boolean> => {
      if (!user || !profile) {
        Notifier.error('You must be logged in to manage favorites');
        return false;
      }

      if (isTrackFavorite(trackId)) {
        Notifier.info('Track is already in favorites');
        return true;
      }

      try {
        const result = await UserService.toggleFavoriteTrack(user.uid, trackId);
        if (result.success) {
          // Update profile optimistically (add to beginning, newest first)
          const updatedFavorites = [trackId, ...(profile.favoriteTracks || [])];
          await updateProfile({ favoriteTracks: updatedFavorites });
          Notifier.success(result.message || 'Track added to favorites');
          return true;
        } else {
          Notifier.error(result.message || 'Failed to add track to favorites');
          return false;
        }
      } catch (error) {
        Logger.error(
          'Error adding track to favorites:',
          error,
          '💟 useFavoriteTracks'
        );
        Notifier.error('Failed to add track to favorites');
        return false;
      }
    },
    [user, profile, updateProfile, isTrackFavorite]
  );

  // Remove track from favorites
  const removeFromFavorites = useCallback(
    async (trackId: string): Promise<boolean> => {
      if (!user || !profile) {
        Notifier.error('You must be logged in to manage favorites');
        return false;
      }

      if (!isTrackFavorite(trackId)) {
        Notifier.info('Track is not in favorites');
        return true;
      }

      try {
        const result = await UserService.toggleFavoriteTrack(user.uid, trackId);
        if (result.success) {
          // Update profile optimistically
          const updatedFavorites = (profile.favoriteTracks || []).filter(
            (id) => id !== trackId
          );
          await updateProfile({ favoriteTracks: updatedFavorites });
          Notifier.warn(result.message || 'Track removed from favorites');
          return true;
        } else {
          Notifier.error(
            result.message || 'Failed to remove track from favorites'
          );
          return false;
        }
      } catch (error) {
        Logger.error(
          'Error removing track from favorites:',
          error,
          '💟 useFavoriteTracks'
        );
        Notifier.error('Failed to remove track from favorites');
        return false;
      }
    },
    [user, profile, updateProfile, isTrackFavorite]
  );

  // Toggle track favorite status
  const toggleFavoriteTrack = useCallback(
    async (trackId: string): Promise<boolean> => {
      if (isTrackFavorite(trackId)) {
        Logger.info(
          'Removing track from favorites:',
          trackId,
          '💟 useFavoriteTracks'
        );
        return await removeFromFavorites(trackId);
      } else {
        Logger.info(
          'Adding track to favorites:',
          trackId,
          '💟 useFavoriteTracks'
        );
        return await addToFavorites(trackId);
      }
    },
    [isTrackFavorite, addToFavorites, removeFromFavorites]
  );

  // Get favorite tracks count
  const favoriteTracksCount = useMemo(() => {
    return profile?.favoriteTracks?.length || 0;
  }, [profile?.favoriteTracks]);

  // Get favorite track IDs
  const favoriteTrackIds = useMemo(() => {
    return profile?.favoriteTracks || [];
  }, [profile?.favoriteTracks]);

  return {
    isTrackFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavoriteTrack,
    favoriteTracksCount,
    favoriteTrackIds
  };
};

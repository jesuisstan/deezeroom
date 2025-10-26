import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TabView } from 'react-native-tab-view';
import { useClient } from 'urql';

import AddTracksButton from '@/components/playlists/AddTracksButton';
import AddTracksToPlaylistComponent from '@/components/playlists/AddTracksToPlaylistComponent';
import CoverTab from '@/components/playlists/CoverTab';
import InfoTab from '@/components/playlists/InfoTab';
import UserInviteComponent from '@/components/playlists/UserInviteComponent';
import TrackCard from '@/components/search-tracks/TrackCard';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { GET_TRACK } from '@/graphql/queries';
import { Track } from '@/graphql/schema';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import {
  usePlaybackActions,
  usePlaybackState,
  usePlaybackUI
} from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import {
  Playlist,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';
import { UserProfile } from '@/utils/firebase/firebase-service-user';

const PlaylistDetailScreen = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const urqlClient = useClient();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'cover', title: 'QCover' },
    { key: 'info', title: 'Info' }
  ]);
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState<boolean>(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Playback hooks
  const { currentTrack } = usePlaybackState();
  const { isPlaying } = usePlaybackUI();
  const { startPlayback, togglePlayPause, updateQueue } = usePlaybackActions();

  const loadPlaylist = useCallback(
    async (silent = false) => {
      if (!id || !user) return;

      try {
        if (!silent) {
          setIsLoading(true);
        }
        setError(null);

        const playlistData = await PlaylistService.getPlaylist(id);

        if (!playlistData) {
          setError('Playlist not found');
          return;
        }

        // Check if user has access to this playlist
        const hasAccess =
          playlistData.visibility === 'public' ||
          playlistData.createdBy === user.uid ||
          playlistData.participants.some((p) => p.userId === user.uid);

        if (!hasAccess) {
          setError('You do not have access to this playlist');
          return;
        }

        setPlaylist(playlistData);

        // Check if user can edit this playlist
        const hasEditPermission = await PlaylistService.canUserEditPlaylist(
          id,
          user.uid
        );
        setCanEdit(hasEditPermission);

        setTrackIds((playlistData.tracks as string[]) || []);
      } catch (error) {
        Logger.error('Error loading playlist:', error);
        setError('Failed to load playlist');
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: 'Failed to load playlist'
        });
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [id, user]
  );

  useEffect(() => {
    loadPlaylist();
  }, [id, user, loadPlaylist]);

  useEffect(() => {
    const fetchTrackDetails = async () => {
      if (!trackIds || trackIds.length === 0) {
        setTracks([]);
        return;
      }
      try {
        setTracksLoading(true);
        const results = await Promise.all(
          trackIds.map((trackId) =>
            urqlClient
              .query(GET_TRACK, { id: trackId })
              .toPromise()
              .catch(() => ({ data: null }))
          )
        );
        const loaded: Track[] = results
          .map((res: any) => res?.data?.track)
          .filter((t: any) => !!t);
        setTracks(loaded);
      } catch (e) {
        Logger.error('Error loading playlist tracks', e);
      } finally {
        setTracksLoading(false);
      }
    };
    fetchTrackDetails();
  }, [trackIds, urqlClient]);

  // Auto-update playback queue when tracks change (for real-time collaboration)
  useEffect(() => {
    if (tracks.length > 0) {
      // Only update queue if we're currently playing tracks from this playlist
      // Check if current track is in the tracks array (meaning we're playing this playlist)
      const isPlayingThisPlaylist =
        currentTrack && tracks.some((t) => t.id === currentTrack.id);

      if (isPlayingThisPlaylist) {
        // Update the queue with new tracks while preserving playback
        updateQueue(tracks);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  const handleBack = () => {
    router.back();
  };

  const handleDeletePlaylist = () => {
    if (!playlist || !user) return;

    Alert.delete(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
      async () => {
        try {
          await PlaylistService.deletePlaylist(playlist.id);

          Notifier.shoot({
            type: 'warn',
            title: 'Success',
            message: 'Playlist deleted successfully'
          });

          // Navigate back to playlists and force refresh
          router.replace('/(tabs)/playlists');
        } catch (error) {
          Logger.error('Error deleting playlist:', error);
          Notifier.shoot({
            type: 'error',
            title: 'Error',
            message: 'Failed to delete playlist'
          });
        }
      }
    );
  };

  const handleEditPlaylist = () => {
    // TODO: Implement edit playlist functionality
    Notifier.shoot({
      type: 'info',
      title: 'Coming Soon',
      message: 'Edit playlist functionality will be available soon'
    });
  };

  const handleInviteUsers = () => {
    if (!playlist || !user) return;

    // Check if user can invite
    const canInvite =
      playlist.createdBy === user.uid ||
      playlist.participants.some(
        (p) => p.userId === user.uid && p.role === 'editor'
      );

    if (!canInvite) {
      Notifier.shoot({
        type: 'error',
        title: 'Permission Denied',
        message: 'You do not have permission to invite users to this playlist'
      });
      return;
    }

    setShowInviteModal(true);
  };

  const handleSendInvitations = async (selectedUsers: UserProfile[]) => {
    if (!playlist || !user || selectedUsers.length === 0) return;

    try {
      const invitationResult =
        await PlaylistService.inviteMultipleUsersToPlaylist(
          playlist.id,
          selectedUsers.map((user) => ({
            userId: user.uid,
            displayName: user.displayName,
            email: user.email
          })),
          user.uid
        );

      if (invitationResult.success && invitationResult.invitedCount > 0) {
        Notifier.shoot({
          type: 'success',
          title: 'Invitations Sent',
          message: `${invitationResult.invitedCount} invitation(s) sent successfully!`
        });

        // Show warnings for any errors
        if (invitationResult.errors.length > 0) {
          Notifier.shoot({
            type: 'warn',
            title: 'Some invitations failed',
            message: invitationResult.errors.join(', ')
          });
        }

        // Reload playlist to get updated participants
        await loadPlaylist();
      } else {
        Notifier.shoot({
          type: 'error',
          title: 'Failed to Send Invitations',
          message:
            invitationResult.errors.join(', ') || 'No invitations were sent'
        });
      }
    } catch (error) {
      Logger.error('Error sending invitations:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to send invitations'
      });
      throw error; // Re-throw to let UserInviteModal handle loading state
    }
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
  };

  const handleAddTrack = () => {
    if (!playlist || !user) return;

    if (!canEdit) {
      Notifier.shoot({
        type: 'error',
        title: 'Permission Denied',
        message: 'You do not have permission to add tracks to this playlist'
      });
      return;
    }

    setShowSearchModal(true);
  };

  const handleCloseSearchModal = useCallback(async () => {
    // Stop any playing previews before closing
    // (cleanup is handled in AddTracksToPlaylistComponent useEffect)
    setShowSearchModal(false);
  }, []);

  const handlePlayTrack = (track: Track) => {
    // Check if this track is currently playing
    if (currentTrack?.id === track.id) {
      // If same track, toggle play/pause
      togglePlayPause();
      return;
    }

    // Start playback with tracks from this playlist
    startPlayback(tracks, track.id);
  };

  const handleRefresh = async () => {
    if (!playlist || !user) return;

    try {
      setIsRefreshing(true);

      // Reload playlist to get latest state (including participants and tracks)
      const latestPlaylist = await PlaylistService.getPlaylist(playlist.id);

      if (latestPlaylist) {
        setPlaylist(latestPlaylist);
        setTrackIds((latestPlaylist.tracks as string[]) || []);

        // Re-check edit permissions
        const hasEditPermission = await PlaylistService.canUserEditPlaylist(
          playlist.id,
          user.uid
        );
        setCanEdit(hasEditPermission);
      }

      // Reload tracks
      const trackIdsToLoad = latestPlaylist?.tracks || [];
      if (trackIdsToLoad.length > 0) {
        const results = await Promise.all(
          trackIdsToLoad.map((trackId) =>
            urqlClient
              .query(GET_TRACK, { id: trackId })
              .toPromise()
              .catch(() => ({ data: null }))
          )
        );
        const loaded: Track[] = results
          .map((res: any) => res?.data?.track)
          .filter((t: any) => !!t);
        setTracks(loaded);
      } else {
        setTracks([]);
      }
    } catch (error) {
      Logger.error('Error refreshing playlist:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to refresh playlist'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const addTrackToPlaylist = async (track: Track, latestPlaylist: Playlist) => {
    if (!playlist || !user) return;

    try {
      // Add track to playlist
      await PlaylistService.addTrackToPlaylist(
        playlist.id,
        track.id,
        track.duration,
        user.uid
      );

      // Reload playlist to get updated tracks (silent mode to keep modal open)
      await loadPlaylist(true);
    } catch (error) {
      Logger.error('Error adding track to playlist:', error);

      // Check for specific errors
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          Notifier.shoot({
            type: 'error',
            title: 'Permission Denied',
            message: 'You do not have permission to add tracks to this playlist'
          });
        } else {
          Notifier.shoot({
            type: 'error',
            title: 'Error',
            message: error.message
          });
        }
      } else {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: 'Failed to add track to playlist'
        });
      }
    }
  };

  const removeTrackFromPlaylist = async (
    track: Track,
    latestPlaylist: Playlist
  ) => {
    if (!playlist || !user) return;

    try {
      // Remove track from playlist
      await PlaylistService.removeTrackFromPlaylist(
        playlist.id,
        track.id,
        user.uid
      );

      // Reload playlist to get updated tracks (silent mode to keep modal open)
      await loadPlaylist(true);
    } catch (error) {
      Logger.error('Error removing track from playlist:', error);

      if (error instanceof Error) {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: error.message
        });
      } else {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: 'Failed to remove track from playlist'
        });
      }
    }
  };

  const handleSelectTrack = async (track: Track) => {
    if (!playlist || !user) return;

    try {
      // Reload playlist to get latest state (check for concurrent updates)
      const latestPlaylist = await PlaylistService.getPlaylist(playlist.id);
      if (!latestPlaylist) {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: 'Playlist not found'
        });
        return;
      }

      // Check if track is already in playlist
      const isTrackAlreadyInPlaylist = latestPlaylist.tracks?.includes(
        track.id
      );

      if (isTrackAlreadyInPlaylist) {
        // Remove track from playlist
        await removeTrackFromPlaylist(track, latestPlaylist);
      } else {
        // Track is not in playlist, add it
        await addTrackToPlaylist(track, latestPlaylist);
      }
    } catch (error) {
      Logger.error('Error selecting track:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to update playlist'
      });
    }
  };

  const renderScene = ({ route }: { route: { key: string } }) => {
    switch (route.key) {
      case 'cover':
        return <CoverTab playlist={playlist!} />;
      case 'info':
        return <InfoTab playlist={playlist!} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (error || !playlist) {
    return (
      <View
        className="flex-1 items-center justify-center px-4"
        style={{
          backgroundColor: themeColors[theme]['bg-main']
        }}
      >
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom className="mt-4 text-center opacity-70">
          {error || 'Playlist not found'}
        </TextCustom>
        <RippleButton title="Go Back" onPress={handleBack} className="mt-4" />
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: themeColors[theme]['bg-main']
      }}
    >
      {/* Playlist Content */}
      <ScrollView
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[themeColors[theme]['primary']]}
            tintColor={themeColors[theme]['primary']}
          />
        }
        contentContainerStyle={{
          paddingBottom: 8,
          ...containerWidthStyle
        }}
      >
        {/* Swipeable Cover/Description Section with floating action buttons */}
        <View style={{ position: 'relative' }}>
          <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: Dimensions.get('window').width }}
            style={{ height: Dimensions.get('window').width }}
            renderTabBar={() => null}
          />

          {playlist.createdBy === user?.uid && (
            <View
              style={{
                position: 'absolute',
                zIndex: 10,
                right: 12,
                bottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 12,
                padding: 2,
                backgroundColor: themeColors[theme]['bg-secondary'] + '99',
                borderColor: themeColors[theme]['border'],
                borderWidth: 1
              }}
            >
              <IconButton
                accessibilityLabel="Delete playlist"
                onPress={handleDeletePlaylist}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>

              <IconButton
                accessibilityLabel="Edit playlist"
                onPress={handleEditPlaylist}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={20}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>

              <IconButton
                accessibilityLabel="Invite users"
                onPress={handleInviteUsers}
              >
                <MaterialCommunityIcons
                  name="account-plus-outline"
                  size={20}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>

              {Platform.OS === 'web' && (
                <IconButton
                  accessibilityLabel="Refresh playlist"
                  onPress={handleRefresh}
                >
                  <MaterialCommunityIcons
                    name="refresh"
                    size={20}
                    color={themeColors[theme]['text-main']}
                  />
                </IconButton>
              )}
            </View>
          )}
        </View>

        {/* Dots indicator under content (no labels) */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 4
          }}
        >
          {routes.map((r, i) => (
            <Pressable
              key={r.key}
              onPress={() => setIndex(i)}
              style={{
                width: 15,
                height: 4,
                borderRadius: 3,
                backgroundColor:
                  i === index
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['text-secondary'] + '55'
              }}
            />
          ))}
        </View>

        {/* Action Buttons moved to floating group above cover */}

        {/* Add Track Button - only visible if user can edit */}
        {canEdit && <AddTracksButton onPress={handleAddTrack} />}

        {/* Tracks List */}
        <View>
          {tracksLoading ? (
            <ActivityIndicator
              size="small"
              color={themeColors[theme]['primary']}
              className="m-4"
            />
          ) : (
            tracks &&
            tracks.length > 0 &&
            tracks.map((track, index) => (
              <TrackCard
                key={`${track.id}-${index}`}
                track={track}
                isPlaying={currentTrack?.id === track.id && isPlaying}
                onPress={handlePlayTrack}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Invite Users Modal */}
      <UserInviteComponent
        visible={showInviteModal}
        onClose={handleCloseInviteModal}
        onInvite={handleSendInvitations}
        excludeUserId={user?.uid}
        existingUsers={playlist.participants}
        placeholder="Search users by email or name..."
      />

      {/* Search Tracks Modal */}
      <SwipeModal
        modalVisible={showSearchModal}
        setVisible={setShowSearchModal}
        onClose={handleCloseSearchModal}
        title="Search and Add Tracks"
        size="full"
        disableSwipe
      >
        {playlist && (
          <AddTracksToPlaylistComponent
            onAddTrack={handleSelectTrack}
            onClose={handleCloseSearchModal}
            currentPlaylistTracks={(playlist.tracks as string[]) || []}
            isVisible={showSearchModal}
          />
        )}
      </SwipeModal>
    </View>
  );
};

export default PlaylistDetailScreen;

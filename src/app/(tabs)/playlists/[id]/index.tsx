import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TabView } from 'react-native-tab-view';
import { useClient } from 'urql';

import CoverTab from '@/components/playlists/CoverTab';
import InfoTab from '@/components/playlists/InfoTab';
import UserInviteComponent from '@/components/playlists/UserInviteComponent';
import TrackCard from '@/components/search-tracks/TrackCard';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { GET_TRACK } from '@/graphql/queries';
import { Track } from '@/graphql/schema';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
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
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'cover', title: 'QCover' },
    { key: 'info', title: 'Info' }
  ]);
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState<boolean>(false);

  const loadPlaylist = useCallback(async () => {
    if (!id || !user) return;

    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [id, user]);

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
        contentContainerStyle={{
          paddingBottom: 8,
          ...containerWidthStyle
        }}
      >
        {/* Swipeable Cover/Description Section */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: Dimensions.get('window').width }}
          style={{ height: Dimensions.get('window').width }}
          renderTabBar={() => null}
        />

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

        {/* Action Buttons */}
        <View className="mb-4 flex-row items-center justify-center gap-4 px-4">
          {playlist.createdBy === user?.uid && (
            <View className="flex flex-row ">
              <IconButton
                accessibilityLabel="Delete playlist"
                onPress={handleDeletePlaylist}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={themeColors[theme]['intent-error']}
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
            </View>
          )}
        </View>

        {/* Tracks List */}
        <View className="px-4">
          {tracksLoading ? (
            <View className="items-center py-8">
              <MaterialCommunityIcons
                name="loading"
                size={24}
                color={themeColors[theme]['text-secondary']}
              />
            </View>
          ) : tracks && tracks.length > 0 ? (
            tracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isPlaying={false}
                onPlay={(track) => {
                  console.log('Play track:', track.title);
                }}
              />
            ))
          ) : (
            <View className="items-center py-8">
              <MaterialCommunityIcons
                name="music-note"
                size={48}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom className="mt-4 text-center opacity-70">
                No tracks added yet
              </TextCustom>
              <TextCustom
                size="s"
                className="mt-2 text-center opacity-50"
                color={themeColors[theme]['text-secondary']}
              >
                Add tracks using the Deezer search
              </TextCustom>
            </View>
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
    </View>
  );
};

export default PlaylistDetailScreen;

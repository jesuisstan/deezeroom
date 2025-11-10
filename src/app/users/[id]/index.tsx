import { FC, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import FavoriteTracksList from '@/components/profile/FavoriteTracksList';
import InfoRow from '@/components/profile/InfoRow';
import ShareButton from '@/components/share/ShareButton';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import ArtistLabel from '@/components/ui/ArtistLabel';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { Track } from '@/graphql/schema';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { containerWidthStyle } from '@/style/container-width-style';
import { DeezerService } from '@/utils/deezer/deezer-service';
import type { DeezerArtist } from '@/utils/deezer/deezer-types';
import {
  acceptFriendship,
  type ConnectionDoc,
  deleteFriendship,
  getConnectionBetween,
  isFriends,
  rejectFriendship,
  requestFriendship
} from '@/utils/firebase/firebase-service-connections';
import {
  type FriendsProfileDoc,
  getFriendsProfileDoc,
  getPublicProfileDoc,
  type PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';

type AccessLevel = 'owner' | 'friends' | 'public';

const OtherProfileScreen: FC = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, profile: currentUserProfile } = useUser();

  const [publicDoc, setPublicDoc] = useState<PublicProfileDoc | null>(null);
  const [friendsDoc, setFriendsDoc] = useState<FriendsProfileDoc | null>(null);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public');
  const [loading, setLoading] = useState(true);
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();
  const [connection, setConnection] = useState<ConnectionDoc | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [favoriteArtists, setFavoriteArtists] = useState<DeezerArtist[]>([]);

  // Add padding when mini player is visible
  const { currentTrack } = usePlaybackState(); // global playback state for mini player appeared on the bottom of the screen
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!id || typeof id !== 'string') return;

        // Use locally cached profile data when viewing own profile
        if (user?.uid && user.uid === id) {
          if (!active) return;

          const publicProfile: PublicProfileDoc = {
            displayName:
              currentUserProfile?.displayName || user.displayName || undefined,
            email: currentUserProfile?.email || user.email || undefined,
            photoURL:
              currentUserProfile?.photoURL || user.photoURL || undefined,
            musicPreferences: currentUserProfile?.musicPreferences
              ? {
                  favoriteGenres:
                    currentUserProfile.musicPreferences.favoriteGenres,
                  favoriteArtistIds:
                    currentUserProfile.musicPreferences.favoriteArtistIds
                }
              : undefined
          };

          const friendsProfile: FriendsProfileDoc = {
            bio: currentUserProfile?.publicInfo?.bio,
            location: currentUserProfile?.publicInfo?.location,
            locationName: currentUserProfile?.publicInfo?.locationName,
            locationCoords:
              currentUserProfile?.publicInfo?.locationCoords ?? null,
            favoriteTracks: currentUserProfile?.favoriteTracks || []
          };

          setPublicDoc(publicProfile);
          setFriendsDoc(friendsProfile);
          setAccessLevel('friends');
          setConnection(null);
          setLoading(false);
          return;
        }

        setLoading(true);

        // Load public profile always
        const pub = await getPublicProfileDoc(id);
        if (!active) return;
        setPublicDoc(pub);

        // Determine access level & connection
        let level: AccessLevel = 'public';
        if (user?.uid) {
          const [fr, conn] = await Promise.all([
            isFriends(user.uid, id),
            getConnectionBetween(user.uid, id)
          ]);
          if (!active) return;
          setConnection(conn);
          level = fr ? 'friends' : 'public';
          setAccessLevel(level);
          if (fr) {
            const fdoc = await getFriendsProfileDoc(id);
            if (!active) return;
            setFriendsDoc(fdoc);
          } else {
            setFriendsDoc(null);
          }
        } else {
          setAccessLevel('public');
          setFriendsDoc(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, user?.uid, currentUserProfile, user]);

  // Load favorite artists (public) by IDs and transform to DeezerArtist shape for ArtistLabel
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ids = publicDoc?.musicPreferences?.favoriteArtistIds;
        if (!ids || ids.length === 0) {
          setFavoriteArtists([]);
          return;
        }
        const svc = DeezerService.getInstance();
        const artists = await svc.getArtistsByIdsViaGraphQL(ids.slice(0, 20));
        if (!active) return;
        const deezerLike = artists.map((a) => ({
          id: a.id,
          name: a.name,
          picture: a.picture,
          picture_small: a.pictureSmall,
          picture_medium: a.pictureMedium,
          picture_big: a.pictureBig,
          picture_xl: a.pictureXl
        })) as DeezerArtist[];
        setFavoriteArtists(deezerLike);
      } catch (e) {
        Logger.warn('Failed to load favorite artists', e, '👤 OtherProfile');
      }
    })();
    return () => {
      active = false;
    };
  }, [publicDoc?.musicPreferences?.favoriteArtistIds]);

  const handlePlayTrack = (track: Track | null) => {
    setCurrentPlayingTrackId(track?.id);
  };

  // Friendship actions
  const refreshConnection = async () => {
    if (!user?.uid || !id || typeof id !== 'string') return;
    try {
      const [fr, conn] = await Promise.all([
        isFriends(user.uid, id),
        getConnectionBetween(user.uid, id)
      ]);
      setConnection(conn);
      setAccessLevel(fr ? 'friends' : 'public');
      if (fr) {
        const fdoc = await getFriendsProfileDoc(id);
        setFriendsDoc(fdoc);
      } else {
        setFriendsDoc(null);
      }
    } catch (e) {
      Logger.warn('Failed to refresh connection', e, '👤 OtherProfile');
    }
  };

  const onAddFriend = async () => {
    if (!user?.uid || !id || typeof id !== 'string') return;
    try {
      setActionLoading(true);
      const res = await requestFriendship(user.uid, id);
      if (!res.success) {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: res.message || 'Failed to send request'
        });
      } else {
        Notifier.shoot({
          type: 'success',
          title: 'Success',
          message: 'Friend request sent'
        });
      }
      await refreshConnection();
    } finally {
      setActionLoading(false);
    }
  };

  const onCancelRequest = async () => {
    if (!user?.uid || !id || typeof id !== 'string') return;
    try {
      setActionLoading(true);
      const res = await deleteFriendship(user.uid, id);
      if (!res.success) {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: res.message || 'Failed to cancel request'
        });
      } else {
        Notifier.shoot({ type: 'info', message: 'Request canceled' });
      }
      await refreshConnection();
    } finally {
      setActionLoading(false);
    }
  };

  const onAccept = async () => {
    if (!user?.uid || !id || typeof id !== 'string') return;
    try {
      setActionLoading(true);
      const res = await acceptFriendship(user.uid, id, user.uid);
      if (!res.success) {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: res.message || 'Failed to accept request'
        });
      } else {
        Notifier.shoot({
          type: 'success',
          title: 'Success',
          message: 'Friend request accepted'
        });
      }
      await refreshConnection();
    } finally {
      setActionLoading(false);
    }
  };

  const onReject = async () => {
    if (!user?.uid || !id || typeof id !== 'string') return;
    try {
      setActionLoading(true);
      const res = await rejectFriendship(user.uid, id, user.uid);
      if (!res.success) {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: res.message || 'Failed to reject request'
        });
      } else {
        Notifier.shoot({ type: 'info', message: 'Friend request rejected' });
      }
      await refreshConnection();
    } finally {
      setActionLoading(false);
    }
  };

  const onRemoveFriend = async () => {
    if (!user?.uid || !id || typeof id !== 'string') return;
    try {
      setActionLoading(true);
      const res = await deleteFriendship(user.uid, id);
      if (!res.success) {
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: res.message || 'Failed to remove friend'
        });
      } else {
        Notifier.shoot({ type: 'info', message: 'Removed from friends' });
      }
      await refreshConnection();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <ActivityIndicatorScreen />;
  if (!id || typeof id !== 'string') return <ActivityIndicatorScreen />;

  const displayName = publicDoc?.displayName || 'User';
  const photoURL = publicDoc?.photoURL;
  const email = publicDoc?.email;

  const locationLabel = friendsDoc?.locationName || friendsDoc?.location || '';

  const Chip: FC<{ text: string }> = ({ text }) => (
    <View className="mb-2 mr-2 rounded-full border border-border bg-bg-main px-2 py-1">
      <TextCustom className="text-accent" size="s">
        {text}
      </TextCustom>
    </View>
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: bottomPadding
      }}
      className="bg-bg-main"
    >
      <View style={containerWidthStyle} className="gap-2 px-4 py-4 ">
        {/* Header */}
        <View className="rounded-md border border-border bg-bg-secondary p-4 shadow-sm">
          <View className="flex-row items-center gap-4">
            {photoURL ? (
              <Image
                source={{ uri: photoURL }}
                className="h-24 w-24 rounded-full"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full border border-border bg-primary">
                <TextCustom type="title">
                  {(displayName || '?').trim().charAt(0).toUpperCase()}
                </TextCustom>
              </View>
            )}
            <View className="flex-1">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <TextCustom type="title" size="4xl">
                    {displayName}
                  </TextCustom>
                  {email ? (
                    <TextCustom className="text-accent">{email}</TextCustom>
                  ) : null}
                </View>
                <ShareButton
                  path={`/users/${id}`}
                  title="Share profile"
                  message="Check out this Deezeroom profile:"
                />
              </View>
              {/* Friendship actions row moved below to avoid squeezing header on small screens */}
              {user?.uid && id && typeof id === 'string' && user.uid !== id ? (
                <View className="mt-3 flex-row flex-wrap items-center gap-2">
                  {(() => {
                    const isPending = connection?.status === 'PENDING';
                    const requestedByMe =
                      isPending && connection?.requestedBy === user.uid;
                    const isAccepted = connection?.status === 'ACCEPTED';

                    if (!connection) {
                      return (
                        <RippleButton
                          title="Add friend"
                          size="sm"
                          onPress={onAddFriend}
                          loading={actionLoading}
                        />
                      );
                    }
                    if (isAccepted) {
                      return (
                        <RippleButton
                          title="Remove"
                          size="sm"
                          variant="outline"
                          onPress={onRemoveFriend}
                          loading={actionLoading}
                        />
                      );
                    }
                    if (requestedByMe) {
                      return (
                        <RippleButton
                          title="Cancel request"
                          size="sm"
                          variant="outline"
                          onPress={onCancelRequest}
                          loading={actionLoading}
                        />
                      );
                    }
                    // Incoming request from the other user
                    return (
                      <View className="flex-row items-center gap-2">
                        <RippleButton
                          title="Accept"
                          size="sm"
                          onPress={onAccept}
                          loading={actionLoading}
                        />
                        <RippleButton
                          title="Reject"
                          size="sm"
                          variant="outline"
                          onPress={onReject}
                          loading={actionLoading}
                        />
                      </View>
                    );
                  })()}
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Profile details */}
        <View className="rounded-md border border-border bg-bg-secondary p-4">
          <TextCustom type="subtitle">Private information</TextCustom>
          <InfoRow label="Name" value={displayName} emptyText="No name yet" />
          {accessLevel === 'friends' ? (
            <>
              <InfoRow
                label="About me"
                value={friendsDoc?.bio}
                emptyText="No bio yet"
              />
              <InfoRow
                label="Location"
                value={locationLabel}
                emptyText="No location yet"
              />
            </>
          ) : (
            <View className="mt-2 rounded-xl border border-border bg-bg-main p-3">
              <TextCustom className="text-accent">Friends only</TextCustom>
              <TextCustom>
                About and location are visible to friends.
              </TextCustom>
            </View>
          )}
        </View>

        {/* Music preferences - basic public info */}
        <View className="rounded-md border border-border bg-bg-secondary p-4">
          <TextCustom type="subtitle">Music preferences</TextCustom>
          {/* Favorite artists */}
          <View className="mt-4">
            <TextCustom className="text-accent/60 text-[10px] uppercase tracking-wide">
              Favorite artists
            </TextCustom>
            {favoriteArtists.length === 0 ? (
              <TextCustom className="text-accent/60">
                No favorite artists added yet
              </TextCustom>
            ) : (
              <View className="mt-2 flex-row flex-wrap gap-2">
                {favoriteArtists.map((a) => (
                  <ArtistLabel key={a.id} artist={a} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Favorite Tracks */}
        <View className="rounded-md border border-border bg-bg-secondary p-4">
          <TextCustom type="subtitle" className="mb-4">
            Favorite Tracks
          </TextCustom>
          {accessLevel === 'friends' ? (
            <FavoriteTracksList
              onPlayTrack={handlePlayTrack}
              currentPlayingTrackId={currentPlayingTrackId}
              trackIdsOverride={friendsDoc?.favoriteTracks || []}
            />
          ) : (
            <View className="mt-2 rounded-xl border border-border bg-bg-main p-3">
              <TextCustom className="text-accent">Friends only</TextCustom>
              <TextCustom>Favorite tracks are visible to friends.</TextCustom>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default OtherProfileScreen;

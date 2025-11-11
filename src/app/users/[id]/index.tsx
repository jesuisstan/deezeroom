import { FC, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import FavoriteArtistsList from '@/components/profile/FavoriteArtistsList';
import FavoriteTracksList from '@/components/profile/FavoriteTracksList';
import InfoRow from '@/components/profile/InfoRow';
import ShareButton from '@/components/share/ShareButton';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { Track } from '@/graphql/schema';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
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
  getPublicProfileDoc,
  type PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';
import {
  type UserProfile,
  UserService
} from '@/utils/firebase/firebase-service-user';

type AccessLevel = 'owner' | 'friends' | 'public';

const OtherProfileScreen: FC = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, profile: currentUserProfile } = useUser();
  const { theme } = useTheme();
  const [publicDoc, setPublicDoc] = useState<PublicProfileDoc | null>(null);
  const [privateProfile, setPrivateProfile] = useState<UserProfile | null>(
    null
  );
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public');
  const [loading, setLoading] = useState(true);
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();
  const [connection, setConnection] = useState<ConnectionDoc | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [favoriteArtists, setFavoriteArtists] = useState<DeezerArtist[]>([]);
  const [favoriteArtistsLoading, setFavoriteArtistsLoading] = useState(false);

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
            photoURL:
              currentUserProfile?.photoURL || user.photoURL || undefined,
            bio: currentUserProfile?.bio,
            favoriteArtistIds: currentUserProfile?.favoriteArtistIds || [],
            favoriteTracks: currentUserProfile?.favoriteTracks || []
          };

          setPublicDoc(publicProfile);
          setPrivateProfile(currentUserProfile ?? null);
          setAccessLevel('owner');
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
        let privateData: UserProfile | null = null;
        let connectionDoc: ConnectionDoc | null = null;

        if (user?.uid) {
          const [fr, conn] = await Promise.all([
            isFriends(user.uid, id),
            getConnectionBetween(user.uid, id)
          ]);
          if (!active) return;
          connectionDoc = conn;
          if (fr) {
            level = 'friends';
            try {
              const profile = await UserService.getUserProfile(id);
              if (!active) return;
              if (profile?.friendIds?.includes(user.uid)) {
                privateData = profile;
              } else {
                Logger.info(
                  'FriendIds missing for friendship; treating as public access',
                  { viewer: user.uid, owner: id },
                  '👤 OtherProfile'
                );
              }
            } catch (error) {
              Logger.warn(
                'Failed to load private profile doc',
                error,
                '👤 OtherProfile'
              );
            }
          } else {
            level = 'public';
          }
        }

        if (!active) return;
        setConnection(connectionDoc);
        setAccessLevel(level);
        setPrivateProfile(privateData);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, user?.uid, currentUserProfile, user]);

  // Load favorite artists (public) by IDs and transform to DeezerArtist shape for FavoriteArtistsList
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ids = publicDoc?.favoriteArtistIds;
        if (!ids || ids.length === 0) {
          if (active) {
            setFavoriteArtists([]);
            setFavoriteArtistsLoading(false);
          }
          return;
        }
        if (active) setFavoriteArtistsLoading(true);
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
        if (active) setFavoriteArtists([]);
      } finally {
        if (active) setFavoriteArtistsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [publicDoc?.favoriteArtistIds]);

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
      const level: AccessLevel =
        user.uid === id ? 'owner' : fr ? 'friends' : 'public';
      setAccessLevel(level);

      if (level === 'friends') {
        try {
          const profile = await UserService.getUserProfile(id);
          if (profile?.friendIds?.includes(user.uid)) {
            setPrivateProfile(profile);
          } else {
            setPrivateProfile(null);
          }
        } catch (error) {
          Logger.warn(
            'Failed to refresh private profile',
            error,
            '👤 OtherProfile'
          );
          setPrivateProfile(null);
        }
      } else if (level === 'owner') {
        setPrivateProfile(currentUserProfile);
      } else {
        setPrivateProfile(null);
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
  if (!publicDoc) {
    return (
      <View
        className="flex-1 items-center justify-center gap-2 bg-bg-main px-6"
        style={containerWidthStyle}
      >
        <TextCustom type="bold" size="xl">
          Profile not found
        </TextCustom>
        <TextCustom
          color={themeColors[theme]['text-secondary']}
          className="text-center"
        >
          This account may have been deleted or the link is invalid.
        </TextCustom>
        <RippleButton
          title="Go Back"
          onPress={() => {
            router.back();
          }}
        />
      </View>
    );
  }

  const displayName = publicDoc?.displayName || 'User';
  const photoURL = publicDoc?.photoURL;
  const bioValue = publicDoc?.bio || '';
  const privateInfo = privateProfile?.privateInfo;
  const locationLabel = privateInfo?.locationName || '';
  const phoneValue = privateInfo?.phone || '';
  const birthDateValue = privateInfo?.birthDate || '';
  const publicFavoriteTracks = publicDoc?.favoriteTracks || [];
  const isOwner = typeof id === 'string' && user?.uid === id;
  const viewerUid = user?.uid ?? null;
  const canSeePrivate =
    isOwner || (!!viewerUid && privateProfile?.friendIds?.includes(viewerUid));
  const canSeeEmail = canSeePrivate;
  const visibleEmail = canSeeEmail
    ? privateProfile?.email ||
      (isOwner ? currentUserProfile?.email || user?.email || '' : '')
    : '';
  const emailDisplay = canSeeEmail
    ? visibleEmail || 'Email not provided'
    : 'Email is hidden';

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
                  <TextCustom type="semibold" size="xl">
                    {displayName}
                  </TextCustom>
                  <TextCustom type="italic">{emailDisplay}</TextCustom>
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

        {/* Public information */}
        <View className="rounded-md border border-border bg-bg-secondary p-4">
          <TextCustom type="semibold" size="xl" className="mb-2">
            Public information
          </TextCustom>
          <InfoRow
            label="Display name"
            value={displayName}
            emptyText="No name yet"
          />
          <InfoRow label="Bio" value={bioValue} emptyText="No bio yet" />
        </View>

        {/* Favorite artists */}
        <View className="rounded-md border border-border bg-bg-secondary">
          <FavoriteArtistsList
            artists={favoriteArtists}
            loading={favoriteArtistsLoading}
          />
        </View>

        {/* Favorite tracks */}
        <View className="rounded-md border border-border bg-bg-secondary">
          <FavoriteTracksList
            onPlayTrack={handlePlayTrack}
            currentPlayingTrackId={currentPlayingTrackId}
            trackIdsOverride={publicFavoriteTracks}
          />
        </View>

        {/* Private information */}
        <View className="rounded-md border border-border bg-bg-secondary p-4">
          <TextCustom type="bold" size="xl" className="mb-2">
            Private information
          </TextCustom>
          {canSeePrivate ? (
            <>
              <InfoRow
                label="Phone"
                value={phoneValue}
                emptyText="No phone yet"
              />
              <InfoRow
                label="Birth date"
                value={birthDateValue}
                emptyText="No birth date yet"
              />
              <InfoRow
                label="Location"
                value={locationLabel}
                emptyText="No location yet"
              />
            </>
          ) : (
            <View className="rounded-xl border border-border bg-bg-tertiary p-4">
              <TextCustom className="text-accent">Friends only</TextCustom>
              <TextCustom>
                Phone, birth date and location are visible to friends.
              </TextCustom>
            </View>
          )}
        </View>
        <View className="flex-1">
          <RippleButton
            title="Back to Home"
            onPress={() => router.push('/')}
            disabled={actionLoading}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default OtherProfileScreen;

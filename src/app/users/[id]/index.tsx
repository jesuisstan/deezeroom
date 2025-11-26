import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';
import { useClient } from 'urql';

import FavoriteArtistsList from '@/components/profile-users/FavoriteArtistsList';
import FavoriteTracksList from '@/components/profile-users/FavoriteTracksList';
import FriendsList from '@/components/profile-users/FriendsList';
import InfoRow from '@/components/profile-users/InfoRow';
import ShareButton from '@/components/share/ShareButton';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants';
import { GET_ARTISTS_BY_IDS } from '@/graphql/queries';
import type { Artist, Track } from '@/graphql/types-return';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
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
  const urqlClient = useClient();
  const [refreshing, setRefreshing] = useState(false);
  const [publicDoc, setPublicDoc] = useState<PublicProfileDoc | null>(null);
  const [privateProfile, setPrivateProfile] = useState<UserProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();
  const [connection, setConnection] = useState<ConnectionDoc | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [favoriteArtistsLoading, setFavoriteArtistsLoading] = useState(false);

  // Add padding when mini player is visible
  const { currentTrack } = usePlaybackState(); // global playback state for mini player appeared on the bottom of the screen
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  const fetchProfileSnapshot = useCallback(async () => {
    if (!id || typeof id !== 'string') return null;

    // Viewing own profile: hydrate from local state to avoid extra fetches
    if (user?.uid && user.uid === id) {
      const publicProfile: PublicProfileDoc = {
        displayName:
          currentUserProfile?.displayName || user.displayName || undefined,
        photoURL: currentUserProfile?.photoURL || user.photoURL || undefined,
        bio: currentUserProfile?.bio,
        favoriteArtistIds: currentUserProfile?.favoriteArtistIds || [],
        favoriteTracks: currentUserProfile?.favoriteTracks || []
      };

      return {
        public: publicProfile,
        privateData: currentUserProfile ?? null,
        connectionDoc: null
      };
    }

    const pub = await getPublicProfileDoc(id);

    let privateData: UserProfile | null = null;
    let connectionDoc: ConnectionDoc | null = null;

    if (user?.uid) {
      const [fr, conn] = await Promise.all([
        isFriends(user.uid, id),
        getConnectionBetween(user.uid, id)
      ]);
      connectionDoc = conn;

      if (fr) {
        try {
          const profile = await UserService.getUserProfile(id);
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
      }
    }

    return {
      public: pub,
      privateData,
      connectionDoc
    };
  }, [currentUserProfile, id, user]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!id || typeof id !== 'string') {
        setPublicDoc(null);
        setPrivateProfile(null);
        setConnection(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const snapshot = await fetchProfileSnapshot();
        if (!active || !snapshot) return;

        setPublicDoc(snapshot.public ?? null);
        setPrivateProfile(snapshot.privateData);
        setConnection(snapshot.connectionDoc);
      } catch (error) {
        if (active) {
          Logger.warn(
            'Failed to load profile snapshot',
            error,
            '👤 OtherProfile'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchProfileSnapshot, id]);

  // Load favorite artists (public) by IDs
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
        const result = await urqlClient.query(GET_ARTISTS_BY_IDS, {
          ids: ids.slice(0, 20)
        });
        if (result.error) {
          throw result.error;
        }
        const artists = result.data?.artistsByIds || [];
        if (!active) return;
        setFavoriteArtists(artists);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <View className="flex-1 items-center justify-center gap-2 bg-bg-main px-6">
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
  const locationLabel = privateInfo?.location?.formattedAddress || '';
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

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const snapshot = await fetchProfileSnapshot();
      if (snapshot) {
        setPublicDoc(snapshot.public ?? null);
        setPrivateProfile(snapshot.privateData);
        setConnection(snapshot.connectionDoc);
      }
    } catch (error) {
      Logger.warn('Failed to refresh profile data', error, '👤 OtherProfile');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: bottomPadding
      }}
      className="bg-bg-main"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[themeColors[theme]['primary']]}
          tintColor={themeColors[theme]['primary']}
        />
      }
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
                  <TextCustom
                    type="semibold"
                    size="xl"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {displayName}
                  </TextCustom>
                  <TextCustom
                    type="italic"
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {emailDisplay}
                  </TextCustom>
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
                          width="full"
                          variant="primary"
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
                          width="full"
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
                          width="full"
                        />
                      );
                    }
                    // Incoming request from the other user
                    return (
                      <View className="w-full flex-row items-center gap-2">
                        <View className="flex-1">
                          <RippleButton
                            title="Accept"
                            size="sm"
                            onPress={onAccept}
                            loading={actionLoading}
                            width="full"
                          />
                        </View>
                        <View className="flex-1">
                          <RippleButton
                            title="Reject"
                            size="sm"
                            variant="outline"
                            onPress={onReject}
                            loading={actionLoading}
                            width="full"
                          />
                        </View>
                      </View>
                    );
                  })()}
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Public information */}
        <TextCustom type="bold" size="xl" className="mt-2">
          Public information
        </TextCustom>
        <View className="gap-2 rounded-md border border-border bg-bg-secondary p-4">
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
        <TextCustom type="bold" size="xl" className="mt-2">
          Private information
        </TextCustom>
        <View className="gap-2 rounded-md border border-border bg-bg-secondary p-4">
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
              <View className="mt-2">
                <FriendsList
                  uid={typeof id === 'string' ? id : undefined}
                  friendIds={privateProfile?.friendIds}
                />
              </View>
            </>
          ) : (
            <View
              className="rounded-md border border-intent-warning p-2"
              style={{
                backgroundColor: themeColors[theme]['intent-warning'] + '22'
              }}
            >
              <TextCustom
                className="text-center"
                size="s"
                color={themeColors[theme]['intent-warning']}
              >
                Phone, birth date, location and friends list are visible to
                friends only.
              </TextCustom>
            </View>
          )}
        </View>
        <View className="mb-4 flex-1">
          <RippleButton
            title="Home"
            size="md"
            onPress={() => router.push('/')}
            disabled={actionLoading}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default OtherProfileScreen;

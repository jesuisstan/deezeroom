import { FC, useEffect, useMemo, useState } from 'react';
import { Image, Platform, ScrollView, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import FavoriteTracksList from '@/components/profile/FavoriteTracksList';
import ShareButton from '@/components/share/ShareButton';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import ArtistLabel from '@/components/ui/ArtistLabel';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Track } from '@/graphql/schema';
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
  type FriendsProfileDoc,
  getFriendsProfileDoc,
  getPublicProfileDoc,
  type PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';

type AccessLevel = 'owner' | 'friends' | 'public';

const OtherProfileScreen: FC = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useUser();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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

  const scrollContentStyle: ViewStyle = useMemo(
    () => ({
      paddingBottom: insets.bottom + 32,
      ...(Platform.OS === 'web' ? { alignItems: 'center' as const } : {})
    }),
    [insets.bottom]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!id || typeof id !== 'string') return;

        // If viewing own profile, redirect to self profile page
        if (user?.uid && user.uid === id) {
          router.replace('/profile');
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
  }, [id, user?.uid, router]);

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

  // Helper row
  const InfoRow: FC<{
    label: string;
    value?: string | null;
    emptyText?: string;
  }> = ({ label, value, emptyText = '—' }) => {
    const isEmpty = !value || !value.trim();
    return (
      <View className="flex-row items-start justify-between py-2">
        <TextCustom className="text-accent/60 text-[10px] uppercase tracking-wide">
          {label}
        </TextCustom>
        {isEmpty ? (
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="ml-3 flex-1 text-right"
          >
            {emptyText}
          </TextCustom>
        ) : (
          <TextCustom className="ml-3 flex-1 text-right">{value}</TextCustom>
        )}
      </View>
    );
  };

  const Chip: FC<{ text: string }> = ({ text }) => (
    <View className="mb-2 mr-2 rounded-full border border-border bg-bg-main px-2 py-1">
      <TextCustom className="text-accent" size="s">
        {text}
      </TextCustom>
    </View>
  );

  return (
    <ScrollView
      className="flex-1 bg-bg-main px-4 py-4"
      contentContainerStyle={scrollContentStyle}
    >
      <View className="w-full gap-4" style={[containerWidthStyle]}>
        {/* Header */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4 shadow-sm">
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
                  path={`/profile/${id}`}
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
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <TextCustom type="subtitle">Profile details</TextCustom>
          </View>
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
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
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
          <View className="mt-4">
            <TextCustom className="text-accent/60 text-[10px] uppercase tracking-wide">
              Favorite genres
            </TextCustom>
            {publicDoc?.musicPreferences?.favoriteGenres &&
            publicDoc.musicPreferences.favoriteGenres.length > 0 ? (
              <View className="mt-2 flex-row flex-wrap gap-2">
                {publicDoc.musicPreferences.favoriteGenres.map((g, idx) => (
                  <Chip key={`${g}-${idx}`} text={g} />
                ))}
              </View>
            ) : (
              <TextCustom className="text-accent/60">
                No favorite genres yet
              </TextCustom>
            )}
          </View>
        </View>

        {/* Favorite Tracks */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
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

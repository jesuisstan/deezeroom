import { FC, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import FavoriteTracksList from '@/components/profile/FavoriteTracksList';
import ShareButton from '@/components/share/ShareButton';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import ArtistLabel from '@/components/ui/ArtistLabel';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { Track } from '@/graphql/schema';
import { Notifier } from '@/modules/notifier';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import { deezerService } from '@/utils/deezer/deezer-service';
import type { DeezerArtist } from '@/utils/deezer/deezer-types';
import {
  type ConnectionStatus,
  deleteFriendship,
  getConnectionBetween,
  isFriends,
  requestFriendship
} from '@/utils/firebase/firebase-service-connections';
import {
  FriendsProfileDoc,
  getFriendsProfileDoc,
  getPublicProfileDoc,
  PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';

// Access level based on identity and friendship
type AccessLevel = 'owner' | 'friends' | 'public';

const ProfileScreen: FC = () => {
  const { user, profile, profileLoading } = useUser();
  const { theme } = useTheme();
  const router = useRouter();

  // Add padding when mini player is visible
  const { currentTrack } = usePlaybackState(); // global playback state for mini player appeared on the bottom of the screen
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  const { uid: uidParam } = useLocalSearchParams<{ uid?: string }>();
  const targetUid = (uidParam || profile?.uid) as string | undefined;

  // Remote profile data when viewing another user
  const [publicDoc, setPublicDoc] = useState<PublicProfileDoc | null>(null);
  const [friendsDoc, setFriendsDoc] = useState<FriendsProfileDoc | null>(null);
  const [friendsWithTarget, setFriendsWithTarget] = useState<boolean>(false);
  const [remoteLoading, setRemoteLoading] = useState<boolean>(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus | null>(null);
  const [connBusy, setConnBusy] = useState<boolean>(false);
  // Friend requests are now shown in Notifications screen
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();

  const isOwner = useMemo(
    () => !!user && !!targetUid && user.uid === targetUid,
    [user, targetUid]
  );

  const accessLevel: AccessLevel = useMemo(() => {
    if (isOwner) return 'owner';
    if (friendsWithTarget) return 'friends';
    return 'public';
  }, [isOwner, friendsWithTarget]);

  // Load remote user's public (and friends if applicable) profile
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!targetUid || isOwner) return; // use provider data for owner
      setRemoteLoading(true);
      try {
        const [pub, friendsCheck] = await Promise.all([
          getPublicProfileDoc(targetUid),
          user ? isFriends(user.uid, targetUid) : Promise.resolve(false)
        ]);
        if (cancelled) return;
        setPublicDoc(pub);
        setFriendsWithTarget(!!friendsCheck);

        if (friendsCheck) {
          const fr = await getFriendsProfileDoc(targetUid);
          if (!cancelled) setFriendsDoc(fr);
        } else {
          setFriendsDoc(null);
        }

        // Load connection status for UI
        if (user) {
          const conn = await getConnectionBetween(user.uid, targetUid);
          if (!cancelled) setConnStatus(conn?.status ?? null);
        } else {
          setConnStatus(null);
        }
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [targetUid, user, isOwner]);

  // Friend requests UI and data moved to Notifications screen

  const handlePlayTrack = (track: Track) => {
    setCurrentPlayingTrackId(track.id);
  };

  // Load favorite artists by IDs to ensure fresh data
  const [favoriteArtistsDetailed, setFavoriteArtistsDetailed] = useState<
    DeezerArtist[] | null
  >(null);

  useEffect(() => {
    const ids = (
      accessLevel === 'owner'
        ? (profile?.musicPreferences as any)?.favoriteArtistIds
        : (publicDoc?.musicPreferences as any)?.favoriteArtistIds
    ) as string[] | undefined;
    if (ids && ids.length) {
      (async () => {
        try {
          const artists = await deezerService.getArtistsByIdsViaGraphQL(ids);
          const mapped: DeezerArtist[] = artists.map((a) => ({
            id: a.id,
            name: a.name,
            link: a.link,
            picture: a.picture,
            picture_small: a.pictureSmall,
            picture_medium: a.pictureMedium,
            picture_big: a.pictureBig,
            picture_xl: a.pictureXl,
            type: 'artist'
          }));
          setFavoriteArtistsDetailed(mapped);
        } catch {
          setFavoriteArtistsDetailed([]);
        }
      })();
    } else {
      setFavoriteArtistsDetailed(null);
    }
  }, [accessLevel, profile?.musicPreferences, publicDoc?.musicPreferences]);

  // Loading state: use provider loading for owner, or local for remote
  if (
    (isOwner && profileLoading) ||
    (!isOwner && remoteLoading && !publicDoc)
  ) {
    return <ActivityIndicatorScreen />;
  }

  // Allow unauthenticated viewers to see public profiles

  // Small helper row for labels/values
  const InfoRow: FC<{
    label: string;
    value?: string | null;
    emptyText?: string;
  }> = ({ label, value, emptyText = '—' }) => {
    const isEmpty = !value || !value.trim();
    return (
      <View className="flex-row items-start justify-between py-2">
        <TextCustom type="semibold" size="m">
          {label}
        </TextCustom>
        {isEmpty ? (
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="ml-2 flex-1 text-right"
          >
            {emptyText}
          </TextCustom>
        ) : (
          <TextCustom
            size="s"
            className="ml-2 flex-1 text-right"
            color={themeColors[theme]['primary']}
          >
            {value}
          </TextCustom>
        )}
      </View>
    );
  };

  const Chip: FC<{ text: string }> = ({ text }) => (
    <View className="mb-2 mr-2 rounded-full border border-border bg-bg-main px-2 py-1">
      <TextCustom color={themeColors[theme]['primary']} size="s">
        {text}
      </TextCustom>
    </View>
  );

  // Build share path for this profile
  const profilePath = `/profile${targetUid ? `?uid=${targetUid}` : ''}`;

  // New: resolve location label for display (only place, not coords)
  const locationLabel = (() => {
    if (accessLevel === 'owner') {
      // For owner, use existing stored data for backward compatibility
      return (
        (profile?.publicInfo as any)?.locationName ||
        profile?.publicInfo?.location ||
        ''
      );
    }
    if (accessLevel === 'friends') {
      return friendsDoc?.locationName || friendsDoc?.location || '';
    }
    return '';
  })();

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
        <View>
          <View className="flex-row items-center justify-between">
            {/* Left: Avatar + Name */}
            <View className="flex-1 flex-row items-center">
              {(() => {
                const displayName =
                  (accessLevel === 'owner'
                    ? profile?.displayName
                    : publicDoc?.displayName) || 'User';
                const avatarUrl =
                  accessLevel === 'owner'
                    ? profile?.photoURL
                    : publicDoc?.photoURL;
                if (avatarUrl) {
                  return (
                    <Image
                      source={{ uri: avatarUrl }}
                      className="mr-3 h-16 w-16 rounded-full border border-border"
                    />
                  );
                }
                return (
                  <View className="mr-3 h-16 w-16 items-center justify-center rounded-full border border-border bg-bg-main">
                    <TextCustom type="title" size="xl">
                      {displayName?.[0]?.toUpperCase() || 'U'}
                    </TextCustom>
                  </View>
                );
              })()}
              <View className="flex-1">
                <TextCustom type="semibold" size="xl">
                  {(accessLevel === 'owner'
                    ? profile?.displayName
                    : publicDoc?.displayName) || 'User'}
                </TextCustom>
                {accessLevel === 'owner' && profile?.email ? (
                  <TextCustom>{profile.email}</TextCustom>
                ) : null}
              </View>
            </View>
            {/* Right: Share + Friend action */}
            <View className="items-end gap-2">
              <ShareButton
                path={profilePath}
                title="Share profile"
                message="Check out my Deezeroom profile:"
              />
              {!isOwner && user && (
                <>
                  {friendsWithTarget ? (
                    <RippleButton
                      title={connBusy ? 'Removing…' : 'Remove friend'}
                      size="sm"
                      variant="outline"
                      loading={connBusy}
                      onPress={async () => {
                        if (!user || !targetUid) return;
                        try {
                          setConnBusy(true);
                          const res = await deleteFriendship(
                            user.uid,
                            targetUid
                          );
                          if (res.success) {
                            setFriendsWithTarget(false);
                            setConnStatus(null);
                            setFriendsDoc(null);
                            Notifier.shoot({
                              type: 'info',
                              message: 'Removed from friends'
                            });
                          } else {
                            Notifier.shoot({
                              type: 'error',
                              message: res.message || 'Failed to remove friend'
                            });
                          }
                        } finally {
                          setConnBusy(false);
                        }
                      }}
                    />
                  ) : (
                    <RippleButton
                      title={
                        connStatus === 'PENDING'
                          ? 'Friend request sent'
                          : connStatus === 'REJECTED'
                            ? 'Send friend request again'
                            : 'Add friend'
                      }
                      size="sm"
                      disabled={connBusy || connStatus === 'PENDING'}
                      loading={connBusy}
                      onPress={async () => {
                        if (!user || !targetUid) return;
                        try {
                          setConnBusy(true);
                          const res = await requestFriendship(
                            user.uid,
                            targetUid
                          );
                          if (res.success) {
                            setConnStatus('PENDING');
                            Notifier.shoot({
                              type: 'success',
                              message: 'Friend request sent'
                            });
                          } else {
                            Notifier.shoot({
                              type: 'warn',
                              message: res.message || 'Failed to send request'
                            });
                          }
                        } finally {
                          setConnBusy(false);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Owner actions */}
        {accessLevel === 'owner' && (
          <View className="mt-4 flex-row items-center gap-2">
            <View className="flex-1">
              <RippleButton
                width="full"
                title="Edit profile"
                size="sm"
                variant="outline"
                onPress={() => router.push('/profile/edit-profile')}
              />
            </View>
            <View className="flex-1">
              <RippleButton
                width="full"
                title="Settings"
                size="sm"
                variant="outline"
                onPress={() => router.push('/profile/settings')}
              />
            </View>
          </View>
        )}

        {/* Basic information card */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
          <TextCustom type="semibold" size="xl" className="mb-2">
            Profile details
          </TextCustom>
          <InfoRow
            label="Name"
            value={
              accessLevel === 'owner'
                ? profile?.displayName
                : publicDoc?.displayName
            }
            emptyText="No name yet"
          />
          {accessLevel !== 'public' ? (
            <InfoRow
              label="About me"
              value={
                accessLevel === 'owner'
                  ? profile?.publicInfo?.bio
                  : friendsDoc?.bio
              }
              emptyText="No bio yet"
            />
          ) : null}
          {accessLevel !== 'public' ? (
            <InfoRow
              label="Location"
              value={locationLabel}
              emptyText="No location yet"
            />
          ) : null}
        </View>

        {/* Private information card */}
        {accessLevel === 'owner' && (
          <View className="rounded-2xl border border-border bg-bg-secondary p-4">
            <TextCustom type="semibold" size="xl" className="mb-2">
              Private information
            </TextCustom>
            <>
              <InfoRow
                label="Phone"
                value={profile?.privateInfo?.phone}
                emptyText="No phone yet"
              />
              <InfoRow
                label="Birth date"
                value={profile?.privateInfo?.birthDate}
                emptyText="No birth date yet"
              />
            </>
          </View>
        )}
        {/* Friend requests section moved to Notifications screen */}

        {/* Music preferences card */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
          <TextCustom type="semibold" size="xl" className="mb-2">
            Music preferences
          </TextCustom>
          <View>
            {(() => {
              const ids = (
                accessLevel === 'owner'
                  ? (profile?.musicPreferences as any)?.favoriteArtistIds
                  : (publicDoc?.musicPreferences as any)?.favoriteArtistIds
              ) as string[] | undefined;
              if (ids && ids.length) {
                if (!favoriteArtistsDetailed) {
                  return (
                    <TextCustom className="text-accent/60">Loading…</TextCustom>
                  );
                }
                if (favoriteArtistsDetailed.length === 0) {
                  return (
                    <TextCustom className="text-accent/60">
                      No favorite artists found
                    </TextCustom>
                  );
                }
                return (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {favoriteArtistsDetailed.map((a, idx) => (
                      <ArtistLabel key={a.id || idx} artist={a} />
                    ))}
                  </View>
                );
              }
              // Backward-compat fallback
              const items =
                accessLevel === 'owner'
                  ? ((profile?.musicPreferences as any)?.favoriteArtists as
                      | any[]
                      | undefined)
                  : undefined;
              if (!items || items.length === 0) {
                return (
                  <TextCustom className="text-accent/60">
                    No favorite artists added yet
                  </TextCustom>
                );
              }
              return (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {items.map((i, idx) => {
                    if (typeof i === 'string')
                      return <Chip key={`${i}-${idx}`} text={i} />;
                    const a = i as DeezerArtist;
                    return <ArtistLabel key={a.id || idx} artist={a} />;
                  })}
                </View>
              );
            })()}
          </View>
        </View>

        {/* Favorite Tracks card */}
        {accessLevel === 'owner' || accessLevel === 'friends' ? (
          <View className="rounded-2xl border border-border bg-bg-secondary">
            <FavoriteTracksList
              onPlayTrack={handlePlayTrack}
              currentPlayingTrackId={currentPlayingTrackId}
              trackIdsOverride={
                accessLevel === 'owner'
                  ? profile?.favoriteTracks
                  : friendsDoc?.favoriteTracks
              }
            />
          </View>
        ) : (
          <View className="rounded-2xl border border-border bg-bg-secondary p-4 shadow-sm">
            <TextCustom type="semibold" size="xl">
              Favorite Tracks
            </TextCustom>
            <View className="mt-2 rounded-xl border border-border bg-bg-main p-3">
              <TextCustom className="text-accent">Friends only</TextCustom>
              <TextCustom>Favorite tracks are visible to friends.</TextCustom>
            </View>
          </View>
        )}

        {/* FRIENDS LIST card */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4 shadow-sm">
          <TextCustom type="semibold" size="xl" className="mb-2">
            Friends
          </TextCustom>
          <TextCustom>Coming soon</TextCustom>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

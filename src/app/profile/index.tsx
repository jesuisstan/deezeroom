import { FC, useEffect, useMemo, useState } from 'react';
import { Image, Platform, ScrollView, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import type { DeezerArtist } from '@/utils/deezer/deezer-types';
import { deezerService } from '@/utils/deezer/deezer-service';
import {
  getFriendsProfileDoc,
  getPublicProfileDoc,
  FriendsProfileDoc,
  PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';
import {
  isFriends,
  getConnectionBetween,
  requestFriendship,
  deleteFriendship,
  acceptFriendship,
  rejectFriendship,
  type ConnectionStatus
} from '@/utils/firebase/firebase-service-connections';
import { Notifier } from '@/modules/notifier';

// Access level based on identity and friendship
type AccessLevel = 'owner' | 'friends' | 'public';

const ProfileScreen: FC = () => {
  const { user, profile, profileLoading } = useUser();
  const { theme } = useTheme();
  const router = useRouter();
  const { uid: uidParam } = useLocalSearchParams<{ uid?: string }>();
  const targetUid = (uidParam || profile?.uid) as string | undefined;

  // Remote profile data when viewing another user
  const [publicDoc, setPublicDoc] = useState<PublicProfileDoc | null>(null);
  const [friendsDoc, setFriendsDoc] = useState<FriendsProfileDoc | null>(null);
  const [friendsWithTarget, setFriendsWithTarget] = useState<boolean>(false);
  const [remoteLoading, setRemoteLoading] = useState<boolean>(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus | null>(null);
  const [connBusy, setConnBusy] = useState<boolean>(false);
  const [incoming, setIncoming] = useState<
    { otherUid: string; id: string; requestedBy?: string | undefined }[]
  >([]);
  const [outgoing, setOutgoing] = useState<
    { otherUid: string; id: string; requestedBy?: string | undefined }[]
  >([]);
  const [people, setPeople] = useState<Record<string, { displayName?: string; photoURL?: string }>>({});
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();
  const insets = useSafeAreaInsets();

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

  // Owner: load pending friend requests
  useEffect(() => {
    let cancelled = false;
    const loadPending = async () => {
      if (!user || !isOwner) return;
      const { listPendingConnectionsFor } = await import(
        '@/utils/firebase/firebase-service-connections'
      );
      const items = await listPendingConnectionsFor(user.uid);
      if (cancelled) return;
      const inc = items
        .filter((c) => c.requestedBy && c.requestedBy !== user.uid)
        .map((c) => ({
          id: c.id,
          requestedBy: c.requestedBy,
          otherUid: c.userA === user.uid ? c.userB : c.userA
        }));
      const out = items
        .filter((c) => !c.requestedBy || c.requestedBy === user.uid)
        .map((c) => ({
          id: c.id,
          requestedBy: c.requestedBy,
          otherUid: c.userA === user.uid ? c.userB : c.userA
        }));
      setIncoming(inc);
      setOutgoing(out);

      // Load public names/avatars for counterparties
      const uids = Array.from(new Set([...inc, ...out].map((i) => i.otherUid)));
      const proms = uids.map(async (uid) => {
        const p = await getPublicProfileDoc(uid);
        return [uid, { displayName: p?.displayName, photoURL: p?.photoURL }] as const;
      });
      const tuples = await Promise.all(proms);
      if (!cancelled) {
        const map: Record<string, { displayName?: string; photoURL?: string }> = {};
        tuples.forEach(([k, v]) => (map[k] = v));
        setPeople(map);
      }
    };
    loadPending();
    return () => {
      cancelled = true;
    };
  }, [user, isOwner]);

  const handlePlayTrack = (track: Track) => {
    setCurrentPlayingTrackId(track.id);
  };

  // Safe-area aware padding so the last items are not cut off by tab bar/home indicator
  const scrollContentStyle: ViewStyle = {
    paddingBottom: insets.bottom + 32,
    ...(Platform.OS === 'web' ? { alignItems: 'center' as const } : {})
  };

  // Load favorite artists by IDs to ensure fresh data
  const [favoriteArtistsDetailed, setFavoriteArtistsDetailed] = useState<DeezerArtist[] | null>(null);
  
  useEffect(() => {
    const ids = (accessLevel === 'owner'
      ? (profile?.musicPreferences as any)?.favoriteArtistIds
      : (publicDoc?.musicPreferences as any)?.favoriteArtistIds) as
      | string[]
      | undefined;
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
  if ((isOwner && profileLoading) || (!isOwner && remoteLoading && !publicDoc)) {
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
      className="flex-1 bg-bg-main px-4 py-4"
      contentContainerStyle={scrollContentStyle}
    >
      <View style={containerWidthStyle} className="gap-4">
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
          <View className="flex-row items-center justify-between">
            {/* Left: Avatar + Name */}
            <View className="flex-1 flex-row items-center pr-2">
              {(() => {
                const displayName =
                  (accessLevel === 'owner' ? profile?.displayName : publicDoc?.displayName) || 'User';
                const avatarUrl = accessLevel === 'owner' ? profile?.photoURL : publicDoc?.photoURL;
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
                <TextCustom type="title" size="4xl">
                  {(accessLevel === 'owner' ? profile?.displayName : publicDoc?.displayName) || 'User'}
                </TextCustom>
                {accessLevel === 'owner' && profile?.email ? (
                  <TextCustom className="text-accent">{profile.email}</TextCustom>
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
                          const res = await deleteFriendship(user.uid, targetUid);
                          if (res.success) {
                            setFriendsWithTarget(false);
                            setConnStatus(null);
                            setFriendsDoc(null);
                            Notifier.shoot({ type: 'info', message: 'Removed from friends' });
                          } else {
                            Notifier.shoot({ type: 'error', message: res.message || 'Failed to remove friend' });
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
                          const res = await requestFriendship(user.uid, targetUid);
                          if (res.success) {
                            setConnStatus('PENDING');
                            Notifier.shoot({ type: 'success', message: 'Friend request sent' });
                          } else {
                            Notifier.shoot({ type: 'warn', message: res.message || 'Failed to send request' });
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
          <View className="mb-2 flex-row items-center justify-between">
            <TextCustom type="subtitle">Profile details</TextCustom>
          </View>
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
            <TextCustom type="subtitle">Private information</TextCustom>

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
        {accessLevel === 'owner' && (
          <View className="rounded-2xl border border-border bg-bg-secondary p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <TextCustom type="subtitle">Friend requests</TextCustom>
              <RippleButton
                size="sm"
                title="Refresh"
                variant="outline"
                onPress={() => {
                  // retrigger effect
                  if (user) {
                    (async () => {
                      const { listPendingConnectionsFor } = await import(
                        '@/utils/firebase/firebase-service-connections'
                      );
                      const items = await listPendingConnectionsFor(user.uid);
                      const inc = items
                        .filter((c) => c.requestedBy && c.requestedBy !== user.uid)
                        .map((c) => ({ id: c.id, requestedBy: c.requestedBy, otherUid: c.userA === user.uid ? c.userB : c.userA }));
                      const out = items
                        .filter((c) => !c.requestedBy || c.requestedBy === user.uid)
                        .map((c) => ({ id: c.id, requestedBy: c.requestedBy, otherUid: c.userA === user.uid ? c.userB : c.userA }));
                      setIncoming(inc);
                      setOutgoing(out);
                    })();
                  }
                }}
              />
            </View>
            {/* Incoming */}
            <View className="mb-3">
              <TextCustom className="text-accent/60 text-[10px] uppercase tracking-wide">Incoming</TextCustom>
              {incoming.length === 0 ? (
                <TextCustom className="text-accent/60">No incoming requests</TextCustom>
              ) : (
                incoming.map((req) => {
                  const person = people[req.otherUid] || {};
                  const displayName = person.displayName || 'User';
                  const photoURL = person.photoURL;
                  return (
                    <View key={req.id} className="mt-2 flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center">
                        {photoURL ? (
                          <Image source={{ uri: photoURL }} className="mr-3 h-10 w-10 rounded-full border border-border" />
                        ) : (
                          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-main">
                            <TextCustom>{displayName[0]?.toUpperCase() || 'U'}</TextCustom>
                          </View>
                        )}
                        <TextCustom>{displayName}</TextCustom>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <RippleButton
                          title="Accept"
                          size="sm"
                          onPress={async () => {
                            if (!user) return;
                            const res = await acceptFriendship(user.uid, req.otherUid, user.uid);
                            if (res.success) {
                              Notifier.shoot({ type: 'success', message: 'Friend request accepted' });
                              setIncoming((prev) => prev.filter((r) => r.id !== req.id));
                            } else {
                              Notifier.shoot({ type: 'error', message: res.message || 'Failed to accept' });
                            }
                          }}
                        />
                        <RippleButton
                          title="Reject"
                          size="sm"
                          variant="outline"
                          onPress={async () => {
                            if (!user) return;
                            const res = await rejectFriendship(user.uid, req.otherUid, user.uid);
                            if (res.success) {
                              Notifier.shoot({ type: 'info', message: 'Friend request rejected' });
                              setIncoming((prev) => prev.filter((r) => r.id !== req.id));
                            } else {
                              Notifier.shoot({ type: 'error', message: res.message || 'Failed to reject' });
                            }
                          }}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
            {/* Outgoing */}
            <View>
              <TextCustom className="text-accent/60 text-[10px] uppercase tracking-wide">Sent</TextCustom>
              {outgoing.length === 0 ? (
                <TextCustom className="text-accent/60">No sent requests</TextCustom>
              ) : (
                outgoing.map((req) => {
                  const person = people[req.otherUid] || {};
                  const displayName = person.displayName || 'User';
                  const photoURL = person.photoURL;
                  return (
                    <View key={req.id} className="mt-2 flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center">
                        {photoURL ? (
                          <Image source={{ uri: photoURL }} className="mr-3 h-10 w-10 rounded-full border border-border" />
                        ) : (
                          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-main">
                            <TextCustom>{displayName[0]?.toUpperCase() || 'U'}</TextCustom>
                          </View>
                        )}
                        <TextCustom>{displayName}</TextCustom>
                      </View>
                      <RippleButton
                        title="Cancel"
                        size="sm"
                        variant="outline"
                        onPress={async () => {
                          if (!user) return;
                          const res = await deleteFriendship(user.uid, req.otherUid);
                          if (res.success) {
                            Notifier.shoot({ type: 'info', message: 'Request cancelled' });
                            setOutgoing((prev) => prev.filter((r) => r.id !== req.id));
                          } else {
                            Notifier.shoot({ type: 'error', message: res.message || 'Failed to cancel' });
                          }
                        }}
                      />
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* Music preferences card */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
          <TextCustom type="subtitle">Music preferences</TextCustom>
          <View className="mt-4">
            <TextCustom className="text-accent/60 text-[10px] uppercase tracking-wide">
              Favorite artists
            </TextCustom>
            {(() => {
              const ids = (accessLevel === 'owner'
                ? (profile?.musicPreferences as any)?.favoriteArtistIds
                : (publicDoc?.musicPreferences as any)?.favoriteArtistIds) as
                | string[]
                | undefined;
              if (ids && ids.length) {
                if (!favoriteArtistsDetailed) {
                  return (
                    <TextCustom className="text-accent/60">Loading…</TextCustom>
                  );
                }
                if (favoriteArtistsDetailed.length === 0) {
                  return (
                    <TextCustom className="text-accent/60">No favorite artists found</TextCustom>
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
              const items = (accessLevel === 'owner'
                ? ((profile?.musicPreferences as any)?.favoriteArtists as
                    | any[]
                    | undefined)
                : undefined);
              if (!items || items.length === 0) {
                return (
                  <TextCustom className="text-accent/60">No favorite artists added yet</TextCustom>
                );
              }
              return (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {items.map((i, idx) => {
                    if (typeof i === 'string') return <Chip key={`${i}-${idx}`} text={i} />;
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
          <View className="rounded-2xl border border-border bg-bg-secondary p-4">
            <TextCustom type="subtitle" className="mb-4">
              Favorite Tracks
            </TextCustom>
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
            <TextCustom type="subtitle" className="mb-2">
              Favorite Tracks
            </TextCustom>
            <View className="mt-2 rounded-xl border border-border bg-bg-main p-3">
              <TextCustom className="text-accent">Friends only</TextCustom>
              <TextCustom>Favorite tracks are visible to friends.</TextCustom>
            </View>
          </View>
        )}

        {/* Playlists card */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
          <TextCustom type="subtitle">Playlists</TextCustom>
          <View className="mt-3">
            <RippleButton
              width="full"
              title={`Open ${profile?.displayName} Playlists`}
              onPress={() => router.push('/(tabs)/playlists')} //TODO: pass uid param
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

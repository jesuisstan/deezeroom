import { FC, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View
} from 'react-native';

import { useRouter } from 'expo-router';

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
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import type { DeezerArtist } from '@/utils/deezer/deezer-types';
import { listAcceptedConnectionsFor } from '@/utils/firebase/firebase-service-connections';
import { getPublicProfileDoc } from '@/utils/firebase/firebase-service-profiles';

const ProfileScreen: FC = () => {
  const { user, profile, profileLoading } = useUser();
  const { theme } = useTheme();
  const router = useRouter();
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friends, setFriends] = useState<
    { uid: string; displayName?: string; photoURL?: string }[]
  >([]);

  // Add padding when mini player is visible
  const { currentTrack } = usePlaybackState(); // global playback state for mini player appeared on the bottom of the screen
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  const handlePlayTrack = (track: Track | null) => {
    setCurrentPlayingTrackId(track?.id);
  };

  // Load friends list (accepted connections) for current user's profile
  useEffect(() => {
    const uid = (profile as any)?.uid;
    if (!uid) return;
    let active = true;
    (async () => {
      try {
        setFriendsLoading(true);
        const connections = await listAcceptedConnectionsFor(uid);
        const otherUids = connections.map((c) =>
          c.userA === uid ? c.userB : c.userA
        );
        const unique = Array.from(new Set(otherUids)).slice(0, 50); // simple cap
        const docs = await Promise.all(
          unique.map((fid) => getPublicProfileDoc(fid))
        );
        if (!active) return;
        const items = unique.map((fid, i) => ({
          uid: fid,
          displayName: docs[i]?.displayName || docs[i]?.email || 'User',
          photoURL: docs[i]?.photoURL
        }));
        setFriends(items);
      } catch {
        // Silent fail for now; could add Notifier
      } finally {
        if (active) setFriendsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  if (profileLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (!user) {
    return <ActivityIndicatorScreen />; // todo: redirect to auth if needed
  }

  const Chip: FC<{ text: string }> = ({ text }) => (
    <View className="mb-2 mr-2 rounded-full border border-border bg-bg-main px-2 py-1">
      <TextCustom className="text-accent" size="s">
        {text}
      </TextCustom>
    </View>
  );

  const FriendChip: FC<{
    user: { uid: string; displayName?: string; photoURL?: string };
  }> = ({ user }) => (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/users/[id]',
          params: { id: user.uid }
        })
      }
      className="flex-col items-center gap-1"
    >
      {user.photoURL ? (
        <Image
          source={{ uri: user.photoURL }}
          className="h-16 w-16 rounded-full"
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
          <TextCustom size="l" className="text-accent">
            {(user.displayName || 'U').charAt(0).toUpperCase()}
          </TextCustom>
        </View>
      )}
      <TextCustom
        size="s"
        numberOfLines={2}
        style={{
          width: 'auto',
          maxWidth: 80,
          fontFamily: 'Inter',
          textAlign: 'center',
          color: themeColors[theme]['text-main']
        }}
      >
        {user.displayName || 'User'}
      </TextCustom>
    </Pressable>
  );

  // Build share path for this profile
  const profilePath = `/users/${user?.uid ?? ''}`;

  // New: resolve location label for display (only place, not coords)
  const locationLabel =
    (profile?.publicInfo as any)?.locationName ||
    profile?.publicInfo?.location ||
    '';

  return (
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: bottomPadding
      }}
      className="bg-bg-main"
    >
      <View style={containerWidthStyle} className="gap-2 px-4 py-4">
        {/* Header card */}
        <View className="flex-row items-center justify-between">
          {/* Left: Avatar + Name */}
          <View className="flex-1 flex-row items-center">
            {(() => {
              const avatarUrl =
                profile?.photoURL || 'https://via.placeholder.com/100';
              if (avatarUrl) {
                return (
                  <Image
                    source={{ uri: avatarUrl }}
                    className="mr-4 h-24 w-24 rounded-full border border-border"
                  />
                );
              }
              return (
                <View className="mr-4 h-24 w-24 items-center justify-center rounded-full border border-border bg-bg-main">
                  <TextCustom type="title">
                    {(profile?.displayName || profile?.email || '?')
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </TextCustom>
                </View>
              );
            })()}
            <View className="flex-1">
              <TextCustom type="semibold" size="xl">
                {profile?.displayName || 'User'}
              </TextCustom>
              {profile?.email ? <TextCustom>{profile.email}</TextCustom> : null}
            </View>
          </View>
          {/* Right: Share + Friend action */}
          <View className="items-end gap-2">
            <ShareButton
              path={profilePath}
              title="Share profile"
              message="Check out my Deezeroom profile:"
            />
          </View>
        </View>

        {/* profile actions */}
        <View className="flex-row items-center gap-2">
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

        {/* Basic information card */}
        <View className="rounded-md border border-border bg-bg-secondary p-4">
          <TextCustom type="semibold" size="xl" className="mb-2">
            Profile details
          </TextCustom>
          <InfoRow
            label="Name"
            value={profile?.displayName}
            emptyText="No name yet"
          />
          <InfoRow
            label="About me"
            value={profile?.publicInfo?.bio}
            emptyText="No bio yet"
          />
          <InfoRow
            label="Location"
            value={locationLabel}
            emptyText="No location yet"
          />
        </View>

        {/* Private information card */}
        <View className="rounded-md border border-border bg-bg-secondary p-4">
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

        {/* Music preferences card */}
        <View className="rounded-md border border-border bg-bg-secondary p-4">
          <TextCustom type="semibold" size="xl" className="mb-2">
            Music preferences
          </TextCustom>
          <View>
            {(() => {
              const items = profile?.musicPreferences?.favoriteArtists as
                | any[]
                | undefined;
              if (!items || items.length === 0)
                return (
                  <TextCustom className="text-accent/60">
                    No favorite artists added yet
                  </TextCustom>
                );
              return (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {items.map((i, idx) => {
                    if (typeof i === 'string') {
                      return <Chip key={`${i}-${idx}`} text={i} />;
                    }
                    const a = i as DeezerArtist;
                    return <ArtistLabel key={a.id || idx} artist={a} />;
                  })}
                </View>
              );
            })()}
          </View>
        </View>

        {/* Friends card (owner only for now) */}
        <View className="rounded-md border border-border bg-bg-secondary p-4">
          <TextCustom type="semibold" size="xl" className="mb-2">
            Friends
          </TextCustom>
          <View>
            {friendsLoading ? (
              <View className="mt-4 items-center justify-center">
                <ActivityIndicator />
              </View>
            ) : friends.length === 0 ? (
              <TextCustom className="text-accent/60 mt-2">
                No friends yet
              </TextCustom>
            ) : (
              <View className="mt-2 flex-row flex-wrap gap-4">
                {friends.map((f) => (
                  <FriendChip key={f.uid} user={f} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Favorite Tracks card */}
        <View className="rounded-md border border-border bg-bg-secondary">
          <FavoriteTracksList
            onPlayTrack={handlePlayTrack}
            currentPlayingTrackId={currentPlayingTrackId}
            trackIdsOverride={profile?.favoriteTracks}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

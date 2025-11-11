import { FC, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  View
} from 'react-native';

import { useRouter } from 'expo-router';

import FavoriteArtistsList from '@/components/profile-users/FavoriteArtistsList';
import FavoriteTracksList from '@/components/profile-users/FavoriteTracksList';
import FriendsList from '@/components/profile-users/FriendsList';
import InfoRow from '@/components/profile-users/InfoRow';
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

const ProfileScreen: FC = () => {
  const { user, profile, profileLoading, refreshProfile } = useUser();
  const { theme } = useTheme();
  const router = useRouter();
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();
  const [favoriteArtists, setFavoriteArtists] = useState<DeezerArtist[]>([]);
  const [favoriteArtistsLoading, setFavoriteArtistsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add padding when mini player is visible
  const { currentTrack } = usePlaybackState(); // global playback state for mini player appeared on the bottom of the screen
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  const handlePlayTrack = (track: Track | null) => {
    setCurrentPlayingTrackId(track?.id);
  };

  // Resolve favorite artists by IDs (public data)
  useEffect(() => {
    let active = true;
    (async () => {
      const ids = profile?.favoriteArtistIds || [];

      if (!ids || ids.length === 0) {
        if (active) {
          setFavoriteArtists([]);
          setFavoriteArtistsLoading(false);
        }
        return;
      }

      try {
        if (active) setFavoriteArtistsLoading(true);
        const svc = DeezerService.getInstance();
        const artists = await svc.getArtistsByIdsViaGraphQL(ids.slice(0, 20));
        if (!active) return;
        const mapped = artists.map((a) => ({
          id: a.id,
          name: a.name,
          picture: a.picture,
          picture_small: a.pictureSmall,
          picture_medium: a.pictureMedium,
          picture_big: a.pictureBig,
          picture_xl: a.pictureXl
        })) as DeezerArtist[];
        setFavoriteArtists(mapped);
      } catch {
        if (active) {
          setFavoriteArtists([]);
        }
      } finally {
        if (active) setFavoriteArtistsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile?.favoriteArtistIds]);

  if (profileLoading && !profile) {
    return <ActivityIndicatorScreen />;
  }

  if (!user) {
    return <ActivityIndicatorScreen />; // todo: redirect to auth if needed
  }

  // Build share path for this profile
  const profilePath = `/users/${user?.uid ?? ''}`;

  // New: resolve location label for display (only place, not coords)
  const locationLabel = profile?.privateInfo?.locationName || '';
  const bioValue = profile?.bio || '';

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch (error) {
      console.warn('Failed to refresh profile', error);
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[themeColors[theme]['primary']]}
          tintColor={themeColors[theme]['primary']}
        />
      }
      className="bg-bg-main"
    >
      <View style={containerWidthStyle} className="gap-2 px-4 py-4">
        {/* Header card */}
        <View className="flex-row items-center justify-between">
          {/* Left: Avatar + Name */}
          <View className="flex-1 flex-row items-center">
            {(() => {
              const avatarUrl = profile?.photoURL;
              if (avatarUrl) {
                return (
                  <Image
                    source={{ uri: avatarUrl }}
                    className="mr-4 h-24 w-24 rounded-full border border-border"
                  />
                );
              }
              return (
                <View className="mr-4 h-24 w-24 items-center justify-center rounded-full border border-border bg-primary">
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

        {/* Public information */}
        <TextCustom type="bold" size="xl" className="mt-2">
          Public information
        </TextCustom>
        <View className="gap-2 rounded-md border border-border bg-bg-secondary p-4">
          <InfoRow
            label="Display name"
            value={profile?.displayName}
            emptyText="No name yet"
          />
          <InfoRow label="Bio" value={bioValue} emptyText="No bio yet" />
        </View>

        {/* Favorite artists (public) */}
        <View className="rounded-md border border-border bg-bg-secondary">
          <FavoriteArtistsList
            artists={favoriteArtists}
            loading={favoriteArtistsLoading}
          />
        </View>

        {/* Favorite tracks (public) */}
        <View className="rounded-md border border-border bg-bg-secondary">
          <FavoriteTracksList
            onPlayTrack={handlePlayTrack}
            currentPlayingTrackId={currentPlayingTrackId}
            trackIdsOverride={profile?.favoriteTracks}
          />
        </View>

        {/* Private information */}
        <TextCustom type="bold" size="xl" className="mt-2">
          Private information
        </TextCustom>
        <View className="gap-2 rounded-md border border-border bg-bg-secondary p-4">
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
          <InfoRow
            label="Location"
            value={locationLabel}
            emptyText="No location yet"
          />
        </View>

        <View className="rounded-md border border-border bg-bg-secondary p-4">
          <FriendsList
            uid={(profile as any)?.uid}
            friendIds={profile?.friendIds}
          />
        </View>

        {/* WEB Footer */}
        {Platform.OS === 'web' && (
          <View className="mt-2 flex-row items-center gap-2">
            <View className="flex-1">
              <RippleButton
                title="Back to Home"
                onPress={() => router.push('/')}
                width="full"
                size="md"
                variant="secondary"
              />
            </View>
            <View className="flex-1">
              <RippleButton
                title="Refresh"
                onPress={handleRefresh}
                width="full"
                size="md"
                loading={refreshing}
                variant="secondary"
              />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

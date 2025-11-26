import { FC, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  View
} from 'react-native';

import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useClient } from 'urql';

import FavoriteArtistsList from '@/components/profile-users/FavoriteArtistsList';
import FavoriteTracksList from '@/components/profile-users/FavoriteTracksList';
import FriendsList from '@/components/profile-users/FriendsList';
import InfoRow from '@/components/profile-users/InfoRow';
import UserSearchModal from '@/components/profile-users/UserSearchModal';
import ShareButton from '@/components/share/ShareButton';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants';
import { GET_ARTISTS_BY_IDS } from '@/graphql/queries';
import type { Artist, Track } from '@/graphql/types-return';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';

const ProfileScreen: FC = () => {
  const { user, profile, profileLoading, refreshProfile } = useUser();
  const { theme } = useTheme();
  const router = useRouter();
  const urqlClient = useClient();
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [favoriteArtistsLoading, setFavoriteArtistsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isUserSearchModalVisible, setIsUserSearchModalVisible] =
    useState(false);

  // Add padding when mini player is visible
  const { currentTrack } = usePlaybackState(); // global playback state for mini player appeared on the bottom of the screen
  const bottomPadding = useMemo(() => {
    return currentTrack
      ? Platform.OS === 'web'
        ? 16 + MINI_PLAYER_HEIGHT
        : MINI_PLAYER_HEIGHT
      : 0;
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
        const result = await urqlClient.query(GET_ARTISTS_BY_IDS, {
          ids: ids.slice(0, 20)
        });
        if (result.error) {
          throw result.error;
        }
        const artists = (result.data?.artistsByIds || []).filter(
          (artist: Artist | null | undefined): artist is Artist =>
            artist !== null && artist !== undefined && artist.id !== undefined
        );
        if (!active) return;
        setFavoriteArtists(artists);
      } catch (error) {
        console.warn('Failed to load favorite artists:', error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const locationLabel = profile?.privateInfo?.location?.formattedAddress || '';
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
            expectedCount={profile?.favoriteArtistIds?.length || 0}
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

        <View className="relative rounded-md border border-border bg-bg-secondary p-4">
          <View
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1
            }}
          >
            <IconButton
              accessibilityLabel="Find a friend"
              onPress={() => setIsUserSearchModalVisible(true)}
              className="h-9 w-9"
              children={
                <Octicons
                  name="person-add"
                  size={18}
                  color={themeColors[theme]['primary']}
                />
              }
            />
          </View>
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

      {/* User Search Modal */}
      <UserSearchModal
        visible={isUserSearchModalVisible}
        onClose={() => setIsUserSearchModalVisible(false)}
        excludeUserId={user?.uid}
      />
    </ScrollView>
  );
};

export default ProfileScreen;

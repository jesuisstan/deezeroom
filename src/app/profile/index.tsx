import { FC, useState } from 'react';
import { Image, Platform, ScrollView, View } from 'react-native';

import { useRouter } from 'expo-router';
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

// Access level scaffolding for future privacy controls
// TODO: Replace with real determination based on viewer and profile privacy/friendship
type AccessLevel = 'owner' | 'friends' | 'public';

const ProfileScreen: FC = () => {
  const { user, profile, profileLoading } = useUser();
  const { theme } = useTheme();
  const router = useRouter();
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();
  const insets = useSafeAreaInsets();

  const accessLevel: AccessLevel = (() => {
    // TODO: derive from profile privacy settings and friendship status
    if (
      user &&
      profile &&
      (user as any).uid &&
      (profile as any).uid &&
      (user as any).uid === (profile as any).uid
    ) {
      return 'owner' as const;
    }
    // if (profile?.relations?.isFriend) return 'friends' as const;
    return 'owner' as const; // default for now
  })();

  const handlePlayTrack = (track: Track) => {
    setCurrentPlayingTrackId(track.id);
  };

  // Safe-area aware padding so the last items are not cut off by tab bar/home indicator
  const scrollContentStyle: ViewStyle = {
    paddingBottom: insets.bottom + 32,
    ...(Platform.OS === 'web' ? { alignItems: 'center' as const } : {})
  };

  if (profileLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (!user) {
    return <ActivityIndicatorScreen />; // todo: redirect to auth if needed
  }

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
  const profilePath = `/profile${user?.uid ? `?uid=${user.uid}` : ''}`;

  // New: resolve location label for display (only place, not coords)
  const locationLabel =
    (profile?.publicInfo as any)?.locationName ||
    profile?.publicInfo?.location ||
    '';

  return (
    <ScrollView
      className="flex-1 bg-bg-main px-4 py-4"
      contentContainerStyle={scrollContentStyle}
    >
      <View className="w-full gap-4" style={[containerWidthStyle]}>
        {/* Header card */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4 shadow-sm">
          <View className="flex-row items-center gap-4">
            {profile?.photoURL ? (
              <Image
                source={{
                  uri: profile.photoURL || 'https://via.placeholder.com/100'
                }}
                className="h-24 w-24 rounded-full"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full border border-border bg-primary">
                <TextCustom type="title">
                  {(profile?.displayName || profile?.email || '?')
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </TextCustom>
              </View>
            )}
            <View className="flex-1">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <TextCustom type="title" size="4xl">
                    {profile?.displayName || 'User'}
                  </TextCustom>
                  {profile?.email ? (
                    <TextCustom className="text-accent">
                      {profile.email}
                    </TextCustom>
                  ) : null}
                </View>
                <ShareButton
                  path={profilePath}
                  title="Share profile"
                  message="Check out my Deezeroom profile:"
                />
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
        </View>

        {/* Basic information card */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <TextCustom type="subtitle">Profile details</TextCustom>
          </View>
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

        {/* Music preferences card */}
        <View className="rounded-2xl border border-border bg-bg-secondary p-4">
          <TextCustom type="subtitle">Music preferences</TextCustom>
          <View className="mt-4">
            <TextCustom className="text-accent/60 text-[10px] uppercase tracking-wide">
              Favorite artists
            </TextCustom>
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

        {/* Favorite Tracks card */}
        {accessLevel === 'owner' || accessLevel === 'friends' ? (
          <View className="rounded-2xl border border-border bg-bg-secondary p-4">
            <TextCustom type="subtitle" className="mb-4">
              Favorite Tracks
            </TextCustom>
            <FavoriteTracksList
              onPlayTrack={handlePlayTrack}
              currentPlayingTrackId={currentPlayingTrackId}
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

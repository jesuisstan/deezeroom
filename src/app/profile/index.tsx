import { FC, useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { useRouter } from 'expo-router';

import FavoriteTracksList from '@/components/profile/FavoriteTracksList';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Track } from '@/graphql/schema';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger/LoggerModule';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';

const ProfileScreen: FC = () => {
  const { user, profile, profileLoading, updateProfile } = useUser();
  const { theme } = useTheme();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | undefined
  >();
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    phone: '',
    birthDate: '',
    favoriteGenres: '',
    favoriteArtists: ''
  });

  // Initialize form data from profile
  useEffect(() => {
    if (profile && !editing) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.publicInfo?.bio || '',
        location: profile.publicInfo?.location || '',
        phone: profile.privateInfo?.phone || '',
        birthDate: profile.privateInfo?.birthDate || '',
        favoriteGenres:
          profile.musicPreferences?.favoriteGenres?.join(', ') || '',
        favoriteArtists:
          profile.musicPreferences?.favoriteArtists?.join(', ') || ''
      });
    }
  }, [profile, editing]);

  const handlePlayTrack = (track: Track) => {
    setCurrentPlayingTrackId(track.id);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const updateData = {
        displayName: formData.displayName,
        publicInfo: {
          bio: formData.bio,
          location: formData.location
        },
        privateInfo: {
          phone: formData.phone,
          birthDate: formData.birthDate
        },
        musicPreferences: {
          favoriteGenres: formData.favoriteGenres
            .split(',')
            .map((g) => g.trim())
            .filter((g) => g),
          favoriteArtists: formData.favoriteArtists
            .split(',')
            .map((a) => a.trim())
            .filter((a) => a)
        }
      };

      await updateProfile(updateData);
      setEditing(false);
      Alert.alert('Success', 'Profile updated');
    } catch (error) {
      Logger.error('Error updating profile', error, 'ProfileScreen');
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  if (profileLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (!user) {
    return <ActivityIndicatorScreen />; // todo
  }

  return (
    <ScrollView className="flex-1 bg-bg-main px-4 py-4">
      <View className="gap-4">
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
            <TextCustom type="title" size="4xl">
              {profile?.displayName || 'User'}
            </TextCustom>
          </View>
        </View>

        <View className="flex-1 flex-row items-center gap-2">
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

        <View className="mb-4 mt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <TextCustom type="subtitle">Basic information</TextCustom>
            <TouchableOpacity
              onPress={() => setEditing(!editing)}
              className="rounded-xl bg-bg-secondary p-2"
            >
              <TextCustom>{editing ? 'Cancel' : 'Edit'}</TextCustom>
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <TextCustom>Name</TextCustom>
            <TextInput
              className={`mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
              value={formData.displayName}
              onChangeText={(text) =>
                setFormData({ ...formData, displayName: text })
              }
              editable={editing}
              placeholder="Enter your name"
            />
          </View>

          <View className="mb-4">
            <TextCustom>About me</TextCustom>
            <TextInput
              className={`mt-1 h-20 rounded-xl border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              editable={editing}
              placeholder="Tell me about yourself"
              multiline
              numberOfLines={3}
            />
          </View>

          <View className="mb-4">
            <TextCustom>Location</TextCustom>
            <TextInput
              className={`mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
              value={formData.location}
              onChangeText={(text) =>
                setFormData({ ...formData, location: text })
              }
              editable={editing}
              placeholder="City, country"
            />
          </View>
        </View>

        <View className="mb-6">
          <TextCustom type="subtitle">Private information</TextCustom>

          <View className="mb-4">
            <TextCustom>Phone</TextCustom>
            <TextInput
              className={`mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              editable={editing}
              placeholder="+1 (999) 123-45-67"
              keyboardType="phone-pad"
            />
          </View>

          <View className="mb-4">
            <TextCustom>Birth date</TextCustom>
            <TextInput
              className={`mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
              value={formData.birthDate}
              onChangeText={(text) =>
                setFormData({ ...formData, birthDate: text })
              }
              editable={editing}
              placeholder="01/01/1990"
            />
          </View>
        </View>

        <View className="mb-6">
          <TextCustom type="subtitle">Music preferences</TextCustom>

          <View className="mb-4">
            <TextCustom>Favorite genres</TextCustom>
            <TextInput
              className={`mt-1 h-20 rounded-xl border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
              value={formData.favoriteGenres}
              onChangeText={(text) =>
                setFormData({ ...formData, favoriteGenres: text })
              }
              editable={editing}
              placeholder="Rock, Pop, Jazz (comma separated)"
              multiline
              numberOfLines={2}
            />
          </View>

          <View className="mb-4">
            <TextCustom>Favorite artists</TextCustom>
            <TextInput
              className={`mt-1 h-20 rounded-xl border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
              value={formData.favoriteArtists}
              onChangeText={(text) =>
                setFormData({ ...formData, favoriteArtists: text })
              }
              editable={editing}
              placeholder="Queen, The Beatles, Pink Floyd (comma separated)"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Favorite Tracks Section */}
        <View className="mb-6">
          <TextCustom type="subtitle" className="mb-4">
            Favorite Tracks
          </TextCustom>
          <FavoriteTracksList
            onPlayTrack={handlePlayTrack}
            currentPlayingTrackId={currentPlayingTrackId}
          />
        </View>

        {editing && (
          <TouchableOpacity
            className="mt-4 items-center rounded-xl bg-bg-secondary p-4"
            onPress={handleSave}
          >
            <TextCustom className="font-bold text-bg-main">Save</TextCustom>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

import { FC, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import { TextCustom } from '@/components/ui/TextCustom';
import { useUser } from '@/providers/UserProvider';

const ProfileScreen: FC = () => {
  const { user, profile, profileLoading, updateProfile } = useUser();
  const [editing, setEditing] = useState(false);
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
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  if (profileLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (!user) {
    return (
      <View className="bg-bg-main flex-1 px-4">
        <TextCustom type="title">User not authorized</TextCustom>
      </View>
    );
  }

  return (
    <ScrollView className="bg-bg-main flex-1 px-4 py-4">
      <View className="mb-6 flex-row items-center border-b border-border pb-4">
        <Image
          source={{ uri: user.photoURL || 'https://via.placeholder.com/100' }}
          className="mr-4 h-20 w-20 rounded-full"
        />
        <View className="flex-1">
          <TextCustom type="title">{user.displayName || 'User'}</TextCustom>
          <TextCustom type="subtitle">{user.email}</TextCustom>
        </View>
      </View>

      <View className="mb-6">
        <View className="mb-4 flex-row items-center justify-between">
          <TextCustom type="subtitle">Basic information</TextCustom>
          <TouchableOpacity
            onPress={() => setEditing(!editing)}
            className="bg-bg-secondary rounded-lg p-2"
          >
            <TextCustom>{editing ? 'Cancel' : 'Edit'}</TextCustom>
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <TextCustom>Name</TextCustom>
          <TextInput
            className={`bg-bg-main text-text-main mt-1 rounded-lg border border-border p-3 ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
            className={`bg-bg-main text-text-main mt-1 h-20 rounded-lg border border-border p-3 ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
            className={`bg-bg-main text-text-main mt-1 rounded-lg border border-border p-3 ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
            className={`bg-bg-main text-text-main mt-1 rounded-lg border border-border p-3 ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
            className={`bg-bg-main text-text-main mt-1 rounded-lg border border-border p-3 ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
            className={`bg-bg-main text-text-main mt-1 h-20 rounded-lg border border-border p-3 ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
            className={`bg-bg-main text-text-main mt-1 h-20 rounded-lg border border-border p-3 ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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

      {editing && (
        <TouchableOpacity
          className="bg-bg-secondary mt-4 items-center rounded-lg p-4"
          onPress={handleSave}
        >
          <TextCustom className="text-bg-main font-bold">Save</TextCustom>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default ProfileScreen;

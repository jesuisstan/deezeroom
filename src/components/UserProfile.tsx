import { FC, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform
} from 'react-native';
import { useUser } from '@/contexts/UserContext';
import { UserService, UserProfile } from '@/utils/firebaseService';
import { ThemedText } from '@/components/ui/ThemedText';

const UserProfileScreen: FC = () => {
  const { user, signOut } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const userProfile = await UserService.getUserProfile(user.uid);
      setProfile(userProfile);

      if (userProfile) {
        setFormData({
          displayName: userProfile.displayName || '',
          bio: userProfile.publicInfo?.bio || '',
          location: userProfile.publicInfo?.location || '',
          phone: userProfile.privateInfo?.phone || '',
          birthDate: userProfile.privateInfo?.birthDate || '',
          favoriteGenres:
            userProfile.musicPreferences?.favoriteGenres?.join(', ') || '',
          favoriteArtists:
            userProfile.musicPreferences?.favoriteArtists?.join(', ') || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const updateData: Partial<UserProfile> = {
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

      await UserService.updateUserProfile(user.uid, updateData);
      await loadUserProfile(); // Reload profile
      setEditing(false);
      Alert.alert('Success', 'Profile updated');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-bg-main px-4">
        <ThemedText type="title">Loading profile...</ThemedText>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-bg-main px-4">
        <ThemedText type="title">User not authorized</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg-main px-4">
      <View className="flex-row items-center mb-6 pb-4 border-b border-accent-main">
        <Image
          source={{ uri: user.photoURL || 'https://via.placeholder.com/100' }}
          className="w-20 h-20 rounded-full mr-4"
        />
        <View className="flex-1">
          <ThemedText type="title">{user.displayName || 'User'}</ThemedText>
          <ThemedText type="subtitle">{user.email}</ThemedText>
        </View>
      </View>

      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <ThemedText type="subtitle">Basic information</ThemedText>
          <TouchableOpacity
            onPress={() => setEditing(!editing)}
            className="p-2 bg-accent-main rounded-lg"
          >
            <ThemedText>{editing ? 'Cancel' : 'Edit'}</ThemedText>
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <ThemedText>Name</ThemedText>
          <TextInput
            className={`border border-accent-main rounded-lg p-3 mt-1 bg-bg-main text-text-main ${!editing ? 'bg-accent-main text-accent-main' : ''}`}
            value={formData.displayName}
            onChangeText={(text) =>
              setFormData({ ...formData, displayName: text })
            }
            editable={editing}
            placeholder="Enter your name"
          />
        </View>

        <View className="mb-4">
          <ThemedText>About me</ThemedText>
          <TextInput
            className={`border border-accent-main rounded-lg p-3 mt-1 bg-bg-main text-text-main h-20 ${!editing ? 'bg-accent-main text-accent-main' : ''}`}
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            editable={editing}
            placeholder="Tell me about yourself"
            multiline
            numberOfLines={3}
          />
        </View>

        <View className="mb-4">
          <ThemedText>Location</ThemedText>
          <TextInput
            className={`border border-accent-main rounded-lg p-3 mt-1 bg-bg-main text-text-main ${!editing ? 'bg-accent-main text-accent-main' : ''}`}
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
        <ThemedText type="subtitle">Private information</ThemedText>

        <View className="mb-4">
          <ThemedText>Phone</ThemedText>
          <TextInput
            className={`border border-accent-main rounded-lg p-3 mt-1 bg-bg-main text-text-main ${!editing ? 'bg-accent-main text-accent-main' : ''}`}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            editable={editing}
            placeholder="+1 (999) 123-45-67"
            keyboardType="phone-pad"
          />
        </View>

        <View className="mb-4">
          <ThemedText>Birth date</ThemedText>
          <TextInput
            className={`border border-accent-main rounded-lg p-3 mt-1 bg-bg-main text-text-main ${!editing ? 'bg-accent-main text-accent-main' : ''}`}
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
        <ThemedText type="subtitle">Music preferences</ThemedText>

        <View className="mb-4">
          <ThemedText>Favorite genres</ThemedText>
          <TextInput
            className={`border border-accent-main rounded-lg p-3 mt-1 bg-bg-main text-text-main h-20 ${!editing ? 'bg-accent-main text-accent-main' : ''}`}
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
          <ThemedText>Favorite artists</ThemedText>
          <TextInput
            className={`border border-accent-main rounded-lg p-3 mt-1 bg-bg-main text-text-main h-20 ${!editing ? 'bg-accent-main text-accent-main' : ''}`}
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
          className="bg-accent-main p-4 rounded-lg items-center mt-4"
          onPress={handleSave}
        >
          <ThemedText className="text-bg-main font-bold">Save</ThemedText>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default UserProfileScreen;

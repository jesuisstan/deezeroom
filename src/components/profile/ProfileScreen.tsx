import { FC, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Connected accounts section is rendered in ProfileSettingsScreen now
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import ButtonCustom from '@/components/ui/ButtonCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/utils/color-theme';

import SignOutButton from './SignOutButton';

const ProfileScreen: FC = () => {
  const { user, profile, profileLoading, updateProfile } = useUser();
  const { theme } = useTheme();
  const router = useRouter();
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
    return <ActivityIndicatorScreen />; // todo
  }

  return (
    <>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor="transparent"
        hidden={true}
      />
      <View className="flex-1 bg-bg-main">
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
            headerRight: () => <SignOutButton />,
            headerStyle: {
              backgroundColor: themeColors[theme]['bg-main']
            },
            headerTintColor: themeColors[theme]['text-main'],
            headerTitleStyle: {
              fontFamily: 'LeagueGothic',
              fontSize: 30
            }
          }}
        />
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
                <ButtonCustom
                  title="Edit profile"
                  size="sm"
                  variant="outline"
                  fullWidth
                  onPress={() => setEditing(!editing)}
                />
              </View>
              <View className="flex-1">
                <ButtonCustom
                  title="Settings"
                  size="sm"
                  variant="outline"
                  fullWidth
                  onPress={() => router.push('/profile/settings')}
                />
              </View>
            </View>

            <View className="mb-4 mt-4">
              <View className="mb-4 flex-row items-center justify-between">
                <TextCustom type="subtitle">Basic information</TextCustom>
                <TouchableOpacity
                  onPress={() => setEditing(!editing)}
                  className="rounded-lg bg-bg-secondary p-2"
                >
                  <TextCustom>{editing ? 'Cancel' : 'Edit'}</TextCustom>
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <TextCustom>Name</TextCustom>
                <TextInput
                  className={`mt-1 rounded-lg border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
                  className={`mt-1 h-20 rounded-lg border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
                  value={formData.bio}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bio: text })
                  }
                  editable={editing}
                  placeholder="Tell me about yourself"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <TextCustom>Location</TextCustom>
                <TextInput
                  className={`mt-1 rounded-lg border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
                  className={`mt-1 rounded-lg border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                  }
                  editable={editing}
                  placeholder="+1 (999) 123-45-67"
                  keyboardType="phone-pad"
                />
              </View>

              <View className="mb-4">
                <TextCustom>Birth date</TextCustom>
                <TextInput
                  className={`mt-1 rounded-lg border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
                  className={`mt-1 h-20 rounded-lg border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
                  className={`mt-1 h-20 rounded-lg border border-border bg-bg-main p-3 text-text-main ${!editing ? 'bg-bg-secondary text-accent' : ''}`}
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
                className="mt-4 items-center rounded-lg bg-bg-secondary p-4"
                onPress={handleSave}
              >
                <TextCustom className="font-bold text-bg-main">Save</TextCustom>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
};

export default ProfileScreen;

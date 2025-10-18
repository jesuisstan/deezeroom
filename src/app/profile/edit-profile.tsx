import { FC, useEffect, useState } from 'react';
import { ScrollView, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

// Guarded runtime import so the screen works even before native rebuild
let RNDateTimePicker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNDateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  RNDateTimePicker = null;
}

// Guarded web datepicker import (optional dependency)
let ReactDatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ReactDatePicker = require('react-datepicker').default;
    // @ts-ignore ensure styles present when dependency installed
    require('react-datepicker/dist/react-datepicker.css');
  } catch {}
}

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import Divider from '@/components/ui/Divider';
import ImageUploader from '@/components/ui/ImageUploader';
import { TextCustom } from '@/components/ui/TextCustom';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger/LoggerModule';
import { useUser } from '@/providers/UserProvider';
import { updateAvatar } from '@/utils/profile-utils';

const EditProfileScreen: FC = () => {
  const { user, profile, updateProfile } = useUser();

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    phone: '',
    birthDate: '',
    favoriteGenres: '',
    favoriteArtists: ''
  });

  const [showBirthPicker, setShowBirthPicker] = useState(false);

  // Constrain content width on web for better readability
  const containerStyle: ViewStyle | undefined =
    Platform.OS === 'web'
      ? { maxWidth: 920, width: '100%', alignSelf: 'center' }
      : undefined;

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.publicInfo?.bio || '',
        location: profile.publicInfo?.location || '',
        phone: profile.privateInfo?.phone || '',
        birthDate: profile.privateInfo?.birthDate || '',
        favoriteGenres: profile.musicPreferences?.favoriteGenres?.join(', ') || '',
        favoriteArtists: profile.musicPreferences?.favoriteArtists?.join(', ') || ''
      });
    }
  }, [profile]);

  const handleImageUploaded = async (imageUrl: string) => {
    if (!user || !profile) return;
    await updateAvatar(imageUrl, profile, updateProfile);
  };

  const handleBirthDateChange = (_: any, date?: Date) => {
    setShowBirthPicker(false);
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      setFormData((prev) => ({ ...prev, birthDate: `${y}-${m}-${d}` }));
    }
  };

  // Helpers for web date formatting
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const parseDate = (value?: string) => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
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
      Alert.alert('Success', 'Profile updated');
    } catch (error) {
      Logger.error('Error updating profile', error, 'EditProfileScreen');
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  return !profile ? (
    <ActivityIndicatorScreen />
  ) : (
    <ScrollView
      className="flex-1 bg-bg-main px-4 py-4"
      contentContainerStyle={Platform.OS === 'web' ? { alignItems: 'center' } : undefined}
    >
      <View className="w-full" style={[containerStyle]}>
        {/* Avatar */}
        <View className="w-full flex-row items-center gap-4 px-4 py-4">
          <ImageUploader
            currentImageUrl={profile?.photoURL}
            onImageUploaded={handleImageUploaded}
            shape="circle"
            placeholder="Add Photo"
            size="sm"
          />
          <TextCustom type="semibold">Change profile picture</TextCustom>
        </View>
        <Divider />

        {/* Basic information */}
        <View className="mt-4">
          <TextCustom type="subtitle">Basic information</TextCustom>

          <View className="mb-4 mt-3">
            <TextCustom>Name</TextCustom>
            <TextInput
              className="mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main"
              value={formData.displayName}
              onChangeText={(text) => setFormData({ ...formData, displayName: text })}
              placeholder="Enter your name"
            />
          </View>

          <View className="mb-4">
            <TextCustom>About me</TextCustom>
            <TextInput
              className="mt-1 h-20 rounded-xl border border-border bg-bg-main p-3 text-text-main"
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Tell me about yourself"
              multiline
              numberOfLines={3}
            />
          </View>

          <View className="mb-4">
            <TextCustom>Location</TextCustom>
            <TextInput
              className="mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholder="City, country"
            />
          </View>
        </View>

        {/* Private information */}
        <View className="mb-6 mt-2">
          <TextCustom type="subtitle">Private information</TextCustom>

          <View className="mb-4">
            <TextCustom>Phone</TextCustom>
            <TextInput
              className="mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="+1 (999) 123-45-67"
              keyboardType="phone-pad"
            />
          </View>

          <View className="mb-4">
            <TextCustom>Birth date</TextCustom>
            {Platform.OS === 'web' ? (
              <View className="mt-1 w-full">
                {ReactDatePicker ? (
                  <>
                    <TouchableOpacity
                      className="rounded-xl border border-border bg-bg-main p-3"
                      onPress={() => setShowBirthPicker(true)}
                    >
                      <TextCustom>{formData.birthDate || 'Select date'}</TextCustom>
                    </TouchableOpacity>
                    {showBirthPicker && (
                      <div className="mt-1 ml 1 dr-date-overlay" onClick={() => setShowBirthPicker(false)}>
                        <div className="dr-date-modal" onClick={(e) => e.stopPropagation()}>
                          {/* @ts-ignore web-only component */}
                          <ReactDatePicker
                            inline
                            selected={parseDate(formData.birthDate)}
                            onChange={(date: any) => {
                              setFormData({ ...formData, birthDate: date ? formatDate(date) : '' });
                              setShowBirthPicker(false);
                            }}
                            maxDate={new Date()}
                            dateFormat="yyyy-MM-dd"
                            showMonthDropdown
                            showYearDropdown
                            dropdownMode="select"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <TextInput
                      className="mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main"
                      value={formData.birthDate}
                      onChangeText={(text) => setFormData({ ...formData, birthDate: text })}
                      placeholder="YYYY-MM-DD"
                    />
                    <TextCustom className="mt-2 text-accent">
                      Temporary input on web (react-datepicker not installed).
                    </TextCustom>
                  </>
                )}
              </View>
            ) : (
              <>
                {RNDateTimePicker ? (
                  <>
                    <TouchableOpacity
                      className="mt-1 rounded-xl border border-border bg-bg-main p-3"
                      onPress={() => setShowBirthPicker(true)}
                    >
                      <TextCustom>{formData.birthDate || 'Select date'}</TextCustom>
                    </TouchableOpacity>
                    {showBirthPicker && (
                      <RNDateTimePicker
                        value={formData.birthDate ? new Date(formData.birthDate) : new Date(1990, 0, 1)}
                        mode="date"
                        display="default"
                        onChange={handleBirthDateChange}
                        maximumDate={new Date()}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <TextInput
                      className="mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main"
                      value={formData.birthDate}
                      onChangeText={(text) => setFormData({ ...formData, birthDate: text })}
                      placeholder="YYYY-MM-DD"
                    />
                    <TextCustom className="mt-2 text-accent">
                      Date picker unavailable. Rebuild the app to enable native picker.
                    </TextCustom>
                  </>
                )}
              </>
            )}
          </View>
        </View>

        {/* Music preferences */}
        <View className="mb-6">
          <TextCustom type="subtitle">Music preferences</TextCustom>

          <View className="mb-4">
            <TextCustom>Favorite genres</TextCustom>
            <TextInput
              className="mt-1 h-20 rounded-xl border border-border bg-bg-main p-3 text-text-main"
              value={formData.favoriteGenres}
              onChangeText={(text) => setFormData({ ...formData, favoriteGenres: text })}
              placeholder="Rock, Pop, Jazz (comma separated)"
              multiline
              numberOfLines={2}
            />
          </View>

          <View className="mb-4">
            <TextCustom>Favorite artists</TextCustom>
            <TextInput
              className="mt-1 h-20 rounded-xl border border-border bg-bg-main p-3 text-text-main"
              value={formData.favoriteArtists}
              onChangeText={(text) => setFormData({ ...formData, favoriteArtists: text })}
              placeholder="Queen, The Beatles, Pink Floyd (comma separated)"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          className="mb-8 mt-2 items-center rounded-xl bg-bg-secondary p-4"
          onPress={handleSave}
        >
          <TextCustom className="font-bold text-bg-main">Save</TextCustom>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default EditProfileScreen;

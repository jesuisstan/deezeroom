import { FC, useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from 'react-native';

import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import Divider from '@/components/ui/Divider';
import ImageUploader, {
  ImageUploaderHandle
} from '@/components/ui/ImageUploader';
import { TextCustom } from '@/components/ui/TextCustom';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger/LoggerModule';
import { useUser } from '@/providers/UserProvider';
import { updateAvatar } from '@/utils/profile-utils';
import * as ExpoLocation from 'expo-location';
import { deezerService } from '@/utils/deezer/deezer-service';
import { DeezerArtist } from '@/utils/deezer/deezer-types';
import type { Artist as GqlArtist } from '@/graphql/schema';

// Guarded runtime import so the screen works even before native rebuild
let RNDateTimePicker: any = null;
try {
  RNDateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  RNDateTimePicker = null;
}

// Guarded web datepicker import (optional dependency)
let ReactDatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    ReactDatePicker = require('react-datepicker').default;
    // @ts-ignore ensure styles present when dependency installed
    require('react-datepicker/dist/react-datepicker.css');
  } catch {}
}

const EditProfileScreen: FC = () => {
  const { user, profile, updateProfile } = useUser();
  const insets = useSafeAreaInsets();

  // Ref to control avatar uploader
  const uploaderRef = useRef<ImageUploaderHandle>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    // location now stored as coordinates + human-readable name
    locationName: '',
    locationCoords: null as null | { lat: number; lng: number },
    phone: '',
    birthDate: '',
    favoriteGenres: ''
  });

  // Artist selection state
  const [selectedArtists, setSelectedArtists] = useState<DeezerArtist[]>([]);
  const [artistQuery, setArtistQuery] = useState('');
  const [artistResults, setArtistResults] = useState<GqlArtist[]>([]);
  const [artistSearching, setArtistSearching] = useState(false);
  const [artistError, setArtistError] = useState<string | null>(null);
  const [debounceId, setDebounceId] = useState<any>(null);

  // Loading state for location detection
  const [locLoading, setLocLoading] = useState(false);
  const [showBirthPicker, setShowBirthPicker] = useState(false);

  // Constrain content width on web for better readability
  const containerStyle: ViewStyle | undefined =
    Platform.OS === 'web'
      ? { maxWidth: 920, width: '100%', alignSelf: 'center' }
      : undefined;

  const contentStyle: ViewStyle = {
    ...(Platform.OS === 'web' ? { alignItems: 'center' as const } : {}),
    paddingBottom: insets.bottom + 32
  };

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.publicInfo?.bio || '',
        locationName:
          (profile.publicInfo as any)?.locationName ||
          profile.publicInfo?.location ||
          '',
        locationCoords: (profile.publicInfo as any)?.locationCoords || null,
        phone: profile.privateInfo?.phone || '',
        birthDate: profile.privateInfo?.birthDate || '',
        favoriteGenres:
          profile.musicPreferences?.favoriteGenres?.join(', ') || ''
      });
      setSelectedArtists(
        (profile.musicPreferences?.favoriteArtists as DeezerArtist[]) || []
      );
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

  const buildPlaceName = (data: any): string => {
    try {
      // Google Geocoding API response
      if (data?.results && Array.isArray(data.results) && data.results[0]) {
        const res = data.results[0];
        const get = (type: string) =>
          res.address_components.find((c: any) => c.types.includes(type))?.
            long_name;
        const city =
          get('locality') ||
          get('postal_town') ||
          get('sublocality') ||
          get('administrative_area_level_2') ||
          '';
        const admin = get('administrative_area_level_1') || '';
        const country = get('country') || '';
        const fromComponents = [city, admin, country].filter(Boolean).join(', ');
        if (fromComponents) return fromComponents;
        if (typeof res.formatted_address === 'string') {
          return res.formatted_address;
        }
      }
      // Expo reverseGeocodeAsync array
      if (Array.isArray(data) && data[0]) {
        const item = data[0] as any;
        const city = item.city || item.town || item.district || item.subregion || '';
        const region = item.region || item.state || '';
        const country = item.country || '';
        const fromExpo = [city, region, country].filter(Boolean).join(', ');
        if (fromExpo) return fromExpo;
        const nm = String(item.name || '').trim();
        const looksLikeCoords = /^(?:[-+]?\d{1,3}(?:\.\d+)?)[,\s]+(?:[-+]?\d{1,3}(?:\.\d+)?)$/.test(nm);
        if (nm && !looksLikeCoords) return nm;
      }
      // Nominatim response
      if (data?.address) {
        const a = data.address;
        const city = a.city || a.town || a.village || a.hamlet || a.suburb || '';
        const region = a.state || a.county || '';
        const country = a.country || '';
        const fromNom = [city, region, country].filter(Boolean).join(', ');
        if (fromNom) return fromNom;
        if (data.display_name) return data.display_name;
      }
    } catch {}
    return '';
  };

  // Web-only: load Google Maps JS SDK and geocode via client to avoid CORS
  const loadGoogleMaps = (key: string) =>
    new Promise<void>((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).google?.maps) {
        resolve();
        return;
      }
      const scriptId = 'gmaps-sdk';
      const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (existing && (window as any).google?.maps) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.id = scriptId;
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly`;
      s.async = true;
      s.onerror = () => reject(new Error('Failed to load Google Maps JS SDK'));
      s.onload = () => resolve();
      document.head.appendChild(s);
    });

  const reverseGeocodeWebWithSDK = async (
    lat: number,
    lng: number,
    key?: string
  ): Promise<string> => {
    if (!key) return '';
    try {
      await loadGoogleMaps(key);
      const geocoder = new (window as any).google.maps.Geocoder();
      const { results } = await geocoder.geocode({ location: { lat, lng } });
      const place = buildPlaceName({ results });
      return place || '';
    } catch (e) {
      Logger.warn('google.maps.Geocoder failed', e, 'EditProfile');
      return '';
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    const key =
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_KEY;

    if (Platform.OS === 'web' && key) {
      const viaSdk = await reverseGeocodeWebWithSDK(lat, lng, key);
      if (viaSdk) return viaSdk;
    }

    // 1) Try Google Geocoding REST if key provided
    try {
      if (key) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
        const resp = await fetch(url);
        const json = await resp.json();
        if (json.status === 'OK') {
          const place = buildPlaceName(json);
          if (place) return place;
        }
      }
    } catch (e) {
      Logger.warn('Google reverse geocode REST failed', e, 'EditProfile');
    }

    // 2) Try Expo reverse geocode
    try {
      const res = await ExpoLocation.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const place = buildPlaceName(res);
      if (place) return place;
    } catch (e) {
      Logger.warn('Expo reverse geocode failed', e, 'EditProfile');
    }

    // 3) Web-only fallback: Nominatim (OpenStreetMap)
    try {
      if (Platform.OS === 'web') {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`;
        const resp = await fetch(url);
        const json = await resp.json();
        const place = buildPlaceName(json);
        if (place) return place;
      }
    } catch (e) {
      Logger.warn('Nominatim reverse geocode failed', e, 'EditProfile');
    }
    return '';
  };

  const detectLocation = async () => {
    try {
      setLocLoading(true);
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed.');
        return;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced
      });
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const place = await reverseGeocode(lat, lng);
      setFormData((prev) => ({
        ...prev,
        locationCoords: { lat, lng },
        locationName: place || prev.locationName
      }));
    } catch (e) {
      Logger.error('Failed to get location', e, 'EditProfile');
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setLocLoading(false);
    }
  };

  const mapGqlArtistToDeezer = (a: GqlArtist): DeezerArtist => ({
    id: a.id,
    name: a.name,
    link: a.link,
    picture: a.picture,
    picture_small: a.pictureSmall,
    picture_medium: a.pictureMedium,
    picture_big: a.pictureBig,
    picture_xl: a.pictureXl,
    type: 'artist'
  });

  const searchArtists = (q: string) => {
    setArtistQuery(q);
    setArtistError(null);
    if (debounceId) clearTimeout(debounceId);

    if (!q || q.trim().length < 2) {
      setArtistResults([]);
      return;
    }

    const id = setTimeout(async () => {
      try {
        setArtistSearching(true);
        const res = await deezerService.searchArtistsViaGraphQL(q, 8, 0);
        setArtistResults(res.artists || []);
      } catch (e: any) {
        Logger.error('Artist search failed', e, 'EditProfile');
        setArtistError('Failed to search');
      } finally {
        setArtistSearching(false);
      }
    }, 300);
    setDebounceId(id);
  };

  const addArtist = (artist: GqlArtist) => {
    const toAdd = mapGqlArtistToDeezer(artist);
    setArtistQuery('');
    setArtistResults([]);
    setSelectedArtists((prev) => {
      // no duplicates and max 20
      if (prev.find((a) => a.id === toAdd.id)) return prev;
      if (prev.length >= 20) return prev;
      return [...prev, toAdd];
    });
  };

  const removeArtist = (id: string) => {
    setSelectedArtists((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const updateData = {
        displayName: formData.displayName,
        publicInfo: {
          bio: formData.bio,
          locationName: formData.locationName || undefined,
          locationCoords: formData.locationCoords || undefined
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
          favoriteArtists: selectedArtists.slice(0, 20)
        }
      } as any;

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
      contentContainerStyle={contentStyle}
    >
      <View className="w-full" style={[containerStyle]}>
        {/* Avatar */}
        <View className="w-full items-center gap-3 px-4 py-6">
          <ImageUploader
            ref={uploaderRef}
            currentImageUrl={profile?.photoURL}
            onImageUploaded={handleImageUploaded}
            shape="circle"
            placeholder="Add Photo"
            size="lg"
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="rounded-full bg-primary px-4 py-2"
              onPress={() => uploaderRef.current?.open()}
            >
              <TextCustom className="text-bg-main">Change photo</TextCustom>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-full border border-border px-4 py-2"
              disabled={!profile?.photoURL}
              onPress={() => uploaderRef.current?.remove()}
            >
              <TextCustom className={!profile?.photoURL ? 'opacity-60' : ''}>
                Remove
              </TextCustom>
            </TouchableOpacity>
          </View>
          <TextCustom size="xs" className="opacity-60">
            JPG or PNG, up to 5 MB. Tip: use a square image for best fit.
          </TextCustom>
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
              onChangeText={(text) =>
                setFormData({ ...formData, displayName: text })
              }
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
            />
          </View>

          {/* Location (read-only) */}
          <View className="mb-4">
            <TextCustom>Location</TextCustom>
            <View className="mt-1 rounded-xl border border-border bg-bg-main p-3">
              {formData.locationCoords ? (
                <TextCustom className="text-text-main">
                  {(() => {
                    const { lat, lng } = formData.locationCoords!;
                    const nm = (formData.locationName || '').trim();
                    const looksLikeCoords = /^(?:[-+]?\d{1,3}(?:\.\d+)?)[,\s]+(?:[-+]?\d{1,3}(?:\.\d+)?)$/.test(nm);
                    return `${lat}, ${lng}${nm && !looksLikeCoords ? ` (${nm})` : ''}`;
                  })()}
                </TextCustom>
              ) : (
                <TextCustom className="text-accent">Not set</TextCustom>
              )}
            </View>
            <View className="mt-2 flex-row gap-8">
              <TouchableOpacity
                className="rounded-xl bg-bg-secondary px-4 py-3"
                onPress={detectLocation}
                disabled={locLoading}
              >
                <TextCustom className="text-bg-main">
                  {locLoading ? 'Detecting…' : 'Use my location'}
                </TextCustom>
              </TouchableOpacity>
              {formData.locationCoords && (
                <TouchableOpacity
                  className="rounded-xl border border-border px-4 py-3"
                  onPress={() =>
                    setFormData({ ...formData, locationCoords: null, locationName: '' })
                  }
                >
                  <TextCustom>Clear</TextCustom>
                </TouchableOpacity>
              )}
            </View>
            <TextCustom size="xs" className="mt-2 opacity-60">
              Coordinates are saved.
            </TextCustom>
          </View>

          <View className="mb-4">
            <TextCustom type="subtitle">Private information</TextCustom>
            <TextCustom>Phone</TextCustom>
            <TextInput
              className="mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View className="mb-4">
            <TextCustom>Birth date</TextCustom>
            {Platform.OS === 'web' ? (
              <>
                <TextInput
                  className="mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main"
                  value={formData.birthDate}
                  onChangeText={(text) =>
                    setFormData({ ...formData, birthDate: text })
                  }
                  placeholder="YYYY-MM-DD"
                />
                <TextCustom className="mt-2 text-accent">
                  Temporary input on web (react-datepicker not installed).
                </TextCustom>
              </>
            ) : (
              <>
                {showBirthPicker && RNDateTimePicker ? (
                  <RNDateTimePicker
                    value={parseDate(formData.birthDate) || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleBirthDateChange}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowBirthPicker(true)}
                    className="mt-1 rounded-xl border border-border bg-bg-main p-3"
                  >
                    <TextCustom className="text-text-main">
                      {formData.birthDate
                        ? formatDate(parseDate(formData.birthDate)!)
                        : 'Select your birth date'}
                    </TextCustom>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {/* Music preferences */}
        <View className="mb-6">
          <TextCustom type="subtitle">Music preferences</TextCustom>

          {/* Favorite artists with search + chips */}
          <View className="mb-2">
            <TextCustom>Favorite artists</TextCustom>
            <TextInput
              className="mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main"
              value={artistQuery}
              onChangeText={searchArtists}
              placeholder={
                selectedArtists.length >= 20
                  ? 'Maximum 20 selected'
                  : 'Start typing artist name'
              }
              editable={selectedArtists.length < 20}
            />
            {artistSearching && (
              <TextCustom size="s" className="mt-2 opacity-60">
                Searching…
              </TextCustom>
            )}
            {!!artistError && (
              <TextCustom size="s" className="mt-2 text-accent">
                {artistError}
              </TextCustom>
            )}
            {artistResults.length > 0 && (
              <View
                className="mt-2 rounded-xl border border-border bg-bg-secondary"
                style={{ borderRadius: 12, overflow: 'hidden' }}
              >
                <ScrollView
                  style={{ maxHeight: 256 }}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {artistResults.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      className="flex-row items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                      onPress={() => addArtist(a)}
                    >
                      {a.pictureSmall ? (
                        <Image
                          source={{ uri: a.pictureSmall }}
                          style={{ width: 32, height: 32, borderRadius: 16 }}
                        />
                      ) : (
                        <View
                          style={{ width: 32, height: 32, borderRadius: 16 }}
                          className="items-center justify-center bg-bg-main"
                        >
                          <TextCustom size="s">{a.name.charAt(0)}</TextCustom>
                        </View>
                      )}
                      <TextCustom className="flex-1">{a.name}</TextCustom>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Selected artists chips */}
          <View className="mt-2">
            <View className="mb-2 flex-row items-center justify-between">
              <TextCustom className="text-accent/60 text-[10px] uppercase tracking-wide">
                Selected
              </TextCustom>
              <TextCustom size="s" className="opacity-60">
                {selectedArtists.length}/20
              </TextCustom>
            </View>
            {selectedArtists.length === 0 ? (
              <TextCustom className="opacity-60">
                No artists selected yet
              </TextCustom>
            ) : (
              <View className="flex-row flex-wrap">
                {selectedArtists.map((a) => (
                  <View
                    key={a.id}
                    className="mb-2 mr-2 flex-row items-center rounded-full border border-border bg-bg-secondary px-2 py-1"
                  >
                    {a.picture_small ? (
                      <Image
                        source={{ uri: a.picture_small }}
                        style={{ width: 20, height: 20, borderRadius: 10, marginRight: 6 }}
                      />
                    ) : (
                      <View
                        style={{ width: 20, height: 20, borderRadius: 10, marginRight: 6 }}
                        className="items-center justify-center bg-bg-main"
                      >
                        <TextCustom size="xs">
                          {a.name.charAt(0)}
                        </TextCustom>
                      </View>
                    )}
                    <TextCustom size="s">{a.name}</TextCustom>
                    <TouchableOpacity
                      onPress={() => removeArtist(a.id)}
                      className="ml-2 rounded-full bg-bg-main px-2 py-1"
                    >
                      <TextCustom size="xs">×</TextCustom>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
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

import { FC, useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import Divider from '@/components/ui/Divider';
import ImageUploader, {
  ImageUploaderHandle
} from '@/components/ui/ImageUploader';
import { TextCustom } from '@/components/ui/TextCustom';
import type { Artist as GqlArtist } from '@/graphql/schema';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger/LoggerModule';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import { deezerService } from '@/utils/deezer/deezer-service';
import { DeezerArtist } from '@/utils/deezer/deezer-types';
import { updateAvatar } from '@/utils/profile-utils';

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
  const { theme } = useTheme();
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
      // Load selected artists details by IDs (preferred), fallback to deprecated stored objects
      const ids = (profile.musicPreferences as any)?.favoriteArtistIds as
        | string[]
        | undefined;
      if (ids && ids.length) {
        deezerService
          .getArtistsByIdsViaGraphQL(ids)
          .then((artists) => {
            setSelectedArtists(
              artists.map((a) => ({
                id: a.id,
                name: a.name,
                link: a.link,
                picture: a.picture,
                picture_small: a.pictureSmall,
                picture_medium: a.pictureMedium,
                picture_big: a.pictureBig,
                picture_xl: a.pictureXl,
                type: 'artist'
              }))
            );
          })
          .catch(() => setSelectedArtists([]));
      } else {
        setSelectedArtists(
          ((profile.musicPreferences as any)?.favoriteArtists as
            | DeezerArtist[]
            | undefined) || []
        );
      }
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
          res.address_components.find((c: any) => c.types.includes(type))
            ?.long_name;
        const city =
          get('locality') ||
          get('postal_town') ||
          get('sublocality') ||
          get('administrative_area_level_2') ||
          '';
        const admin = get('administrative_area_level_1') || '';
        const country = get('country') || '';
        const fromComponents = [city, admin, country]
          .filter(Boolean)
          .join(', ');
        if (fromComponents) return fromComponents;
        if (typeof res.formatted_address === 'string') {
          return res.formatted_address;
        }
      }
      // Expo reverseGeocodeAsync array
      if (Array.isArray(data) && data[0]) {
        const item = data[0] as any;
        const city =
          item.city || item.town || item.district || item.subregion || '';
        const region = item.region || item.state || '';
        const country = item.country || '';
        const fromExpo = [city, region, country].filter(Boolean).join(', ');
        if (fromExpo) return fromExpo;
        const nm = String(item.name || '').trim();
        const looksLikeCoords =
          /^(?:[-+]?\d{1,3}(?:\.\d+)?)[,\s]+(?:[-+]?\d{1,3}(?:\.\d+)?)$/.test(
            nm
          );
        if (nm && !looksLikeCoords) return nm;
      }
      // Nominatim response
      if (data?.address) {
        const a = data.address;
        const city =
          a.city || a.town || a.village || a.hamlet || a.suburb || '';
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
      const existing = document.getElementById(
        scriptId
      ) as HTMLScriptElement | null;
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
      const res = await ExpoLocation.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng
      });
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
          favoriteArtistIds: selectedArtists.slice(0, 20).map((a) => a.id)
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
      <View className="w-full" style={[containerWidthStyle]}>
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
            <RippleButton
              title="Change photo"
              size="sm"
              variant="primary"
              onPress={() => uploaderRef.current?.open()}
            />
            <RippleButton
              title="Remove"
              size="sm"
              variant="outline"
              onPress={() => uploaderRef.current?.remove()}
              disabled={!profile?.photoURL}
            />
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
            <TextCustom type="bold">Name</TextCustom>
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
            <TextCustom type="bold">About me</TextCustom>
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
            <TextCustom type="bold">Location</TextCustom>
            <View className="flex-row items-center gap-2">
              <View>
                {formData.locationCoords ? (
                  <TextCustom color={themeColors[theme]['text-main']}>
                    {(() => {
                      const { lat, lng } = formData.locationCoords!;
                      const nm = (formData.locationName || '').trim();
                      const looksLikeCoords =
                        /^(?:[-+]?\d{1,3}(?:\.\d+)?)[,\s]+(?:[-+]?\d{1,3}(?:\.\d+)?)$/.test(
                          nm
                        );
                      return `${nm && !looksLikeCoords ? `${nm}` : ''}`;
                    })()}
                  </TextCustom>
                ) : (
                  <TextCustom color={themeColors[theme]['text-secondary']}>
                    Not set
                  </TextCustom>
                )}
              </View>
              <IconButton
                accessibilityLabel="Detect location"
                onPress={detectLocation}
                disabled={locLoading}
                loading={locLoading}
                className="h-8 w-8 border border-border"
              >
                <MaterialCommunityIcons
                  name="map-marker"
                  size={18}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>
              {formData.locationCoords && (
                <IconButton
                  accessibilityLabel="Clear location"
                  onPress={() =>
                    setFormData({
                      ...formData,
                      locationCoords: null,
                      locationName: ''
                    })
                  }
                  className="h-8 w-8 border border-border"
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color={themeColors[theme]['text-main']}
                  />
                </IconButton>
              )}
            </View>
          </View>

          <View className="mb-4">
            <TextCustom type="subtitle">Private information</TextCustom>
            <TextCustom type="bold">Phone</TextCustom>
            <TextInput
              className="mt-1 rounded-xl border border-border bg-bg-main p-3 text-text-main"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View className="mb-4">
            <TextCustom type="bold">Birth date</TextCustom>
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
                <TextCustom
                  color={themeColors[theme]['text-secondary']}
                  className="mt-2"
                >
                  Temporary input on web (react-datepicker not installed).
                </TextCustom>
              </>
            ) : (
              <>
                {showBirthPicker && RNDateTimePicker && (
                  <RNDateTimePicker
                    value={parseDate(formData.birthDate) || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleBirthDateChange}
                    style={{ width: '100%' }}
                  />
                )}
                <View className="flex-row items-center gap-2">
                  {formData.birthDate ? (
                    <TextCustom color={themeColors[theme]['text-main']}>
                      {formatDate(parseDate(formData.birthDate)!)}
                    </TextCustom>
                  ) : (
                    <TextCustom color={themeColors[theme]['text-secondary']}>
                      Not set
                    </TextCustom>
                  )}
                  <IconButton
                    accessibilityLabel="Select birth date"
                    onPress={() => setShowBirthPicker(true)}
                    className="h-8 w-8 border border-border"
                  >
                    <MaterialCommunityIcons
                      name="calendar"
                      size={18}
                      color={themeColors[theme]['text-main']}
                    />
                  </IconButton>
                  {formData.birthDate && (
                    <IconButton
                      accessibilityLabel="Clear birth date"
                      onPress={() =>
                        setFormData({ ...formData, birthDate: '' })
                      }
                      className="h-8 w-8 border border-border"
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={18}
                        color={themeColors[theme]['text-main']}
                      />
                    </IconButton>
                  )}
                </View>
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
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          marginRight: 6
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          marginRight: 6
                        }}
                        className="items-center justify-center bg-bg-main"
                      >
                        <TextCustom size="xs">{a.name.charAt(0)}</TextCustom>
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
        <RippleButton
          title="Save"
          size="md"
          variant="primary"
          onPress={handleSave}
        />
      </View>
    </ScrollView>
  );
};

export default EditProfileScreen;

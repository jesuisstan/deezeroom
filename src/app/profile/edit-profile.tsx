import { FC, useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';

import * as ExpoLocation from 'expo-location';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import LineButton from '@/components/ui/buttons/LineButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import Divider from '@/components/ui/Divider';
import ImageUploader, {
  ImageUploaderHandle
} from '@/components/ui/ImageUploader';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
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
  // Scrolling and layout refs
  const scrollRef = useRef<ScrollView>(null);
  const artistsSectionRef = useRef<View>(null);
  const [artistsSectionY, setArtistsSectionY] = useState(0);

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    // location now stored as coordinates + human-readable name
    locationName: '',
    locationCoords: null as null | { lat: number; lng: number },
    phone: '',
    birthDate: ''
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
  // Modals visibility
  const [showNameModal, setShowNameModal] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [showArtistsModal, setShowArtistsModal] = useState(false);

  const contentStyle: ViewStyle = {
    ...(Platform.OS === 'web' ? { alignItems: 'center' as const } : {}),
    paddingBottom: insets.bottom + 32,
    // Make ScrollView content fill the viewport height so we can push the save button down
    flexGrow: 1
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
        birthDate: profile.privateInfo?.birthDate || ''
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
    setShowBirthModal(false);
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
          birthDate: formData.birthDate,
        },
        musicPreferences: {
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

  // When suggestions appear, scroll so the dropdown is visible
  useEffect(() => {
    if (artistResults.length > 0) {
      const timeout = setTimeout(() => {
        const y = Math.max(0, artistsSectionY - 12);
        scrollRef.current?.scrollTo({ y, animated: true });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [artistResults.length, artistsSectionY]);

  return !profile ? (
    <ActivityIndicatorScreen />
  ) : (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: themeColors[theme]['bg-main'] }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-bg-main px-4 py-4"
        contentContainerStyle={contentStyle}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="w-full flex-1"
          style={[containerWidthStyle, { justifyContent: 'space-between' }]}
        >
          {/* Content group (top) */}
          <View>
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
              <RippleButton
                title="Update picture"
                size="sm"
                variant="primary"
                onPress={() => uploaderRef.current?.open()}
              />
              {!!profile?.photoURL && (
                <RippleButton
                  title="Remove"
                  size="sm"
                  variant="outline"
                  onPress={() => uploaderRef.current?.remove()}
                />
              )}
            </View>
            <Divider />

            {/* Personal information as line buttons */}
            <View className="mt-2">
              <TextCustom type="subtitle">Personal information</TextCustom>

              {/* Username */}
              <LineButton onPress={() => setShowNameModal(true)}>
                <View className="w-full py-4">
                  <TextCustom size="s" className="opacity-60">
                    My Username
                  </TextCustom>
                  <TextCustom className="text-primary">
                    {formData.displayName || 'Not set'}
                  </TextCustom>
                </View>
              </LineButton>
              <Divider />

              {/* Date of Birth */}
              <LineButton onPress={() => setShowBirthModal(true)}>
                <View className="w-full py-4">
                  <TextCustom size="s" className="opacity-60">
                    Date of Birth
                  </TextCustom>
                  <TextCustom className="text-primary">
                    {formData.birthDate || 'Not set'}
                  </TextCustom>
                </View>
              </LineButton>
              <Divider />

              {/* About me */}
              <LineButton onPress={() => setShowBioModal(true)}>
                <View className="w-full py-4">
                  <TextCustom size="s" className="opacity-60">
                    About me
                  </TextCustom>
                  <TextCustom numberOfLines={1} className="text-primary">
                    {formData.bio || 'Tap to write'}
                  </TextCustom>
                </View>
              </LineButton>
              <Divider />

              {/* Location */}
              <LineButton onPress={() => setShowLocationModal(true)}>
                <View className="w-full py-4">
                  <TextCustom size="s" className="opacity-60">
                    Location
                  </TextCustom>
                  <TextCustom className="text-primary">
                    {formData.locationName || 'Not set'}
                  </TextCustom>
                </View>
              </LineButton>
              <Divider />

              {/* Phone */}
              <LineButton onPress={() => setShowPhoneModal(true)}>
                <View className="w-full py-4">
                  <TextCustom size="s" className="opacity-60">
                    Phone
                  </TextCustom>
                  <TextCustom className="text-primary">
                    {formData.phone || 'Not set'}
                  </TextCustom>
                </View>
              </LineButton>
            </View>

            <Divider className="my-4" />

            {/* Music preferences */}
            <View className="mt-2">
              <TextCustom type="subtitle">Music preferences</TextCustom>

              {/* Favorite artists */}
              <LineButton onPress={() => setShowArtistsModal(true)}>
                <View className="w-full py-4">
                  <TextCustom size="s" className="opacity-60">
                    Favorite artists
                  </TextCustom>
                  <TextCustom className="text-primary">
                    {selectedArtists.length > 0
                      ? `${selectedArtists.length} selected`
                      : 'None'}
                  </TextCustom>
                </View>
              </LineButton>
            </View>
          </View>

          {/* Save (bottom) */}
          <View className="mt-6">
            <RippleButton
              title="Save"
              size="md"
              variant="primary"
              onPress={handleSave}
            />
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      {/* Name Modal */}
      {showNameModal && (
        <SwipeModal
          title="My Username"
          modalVisible={showNameModal}
          setVisible={setShowNameModal}
        >
          <View className="flex-1 gap-4 px-4 pb-6">
            <InputCustom
              placeholder="Enter your name"
              value={formData.displayName}
              onChangeText={(text) =>
                setFormData((p) => ({ ...p, displayName: text }))
              }
            />
            <RippleButton title="Done" onPress={() => setShowNameModal(false)} />
          </View>
        </SwipeModal>
      )}

      {/* Bio Modal */}
      {showBioModal && (
        <SwipeModal
          title="About me"
          modalVisible={showBioModal}
          setVisible={setShowBioModal}
        >
          <View className="flex-1 gap-4 px-4 pb-6">
            <InputCustom
              placeholder="Tell about yourself"
              value={formData.bio}
              onChangeText={(text) => setFormData((p) => ({ ...p, bio: text }))}
              multiline
            />
            <RippleButton title="Done" onPress={() => setShowBioModal(false)} />
          </View>
        </SwipeModal>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <SwipeModal
          title="Location"
          modalVisible={showLocationModal}
          setVisible={setShowLocationModal}
        >
          <View className="flex-1 gap-4 px-4 pb-6">
            <InputCustom
              placeholder="City, Region, Country"
              value={formData.locationName}
              onChangeText={(text) =>
                setFormData((p) => ({ ...p, locationName: text }))
              }
            />
            <View className="flex-row gap-3">
              <RippleButton
                title={locLoading ? 'Detecting…' : 'Detect location'}
                onPress={detectLocation}
                loading={locLoading}
              />
              {formData.locationCoords && (
                <RippleButton
                  title="Clear"
                  variant="outline"
                  onPress={() =>
                    setFormData((p) => ({
                      ...p,
                      locationCoords: null,
                      locationName: ''
                    }))
                  }
                />
              )}
            </View>
            <RippleButton
              title="Done"
              onPress={() => setShowLocationModal(false)}
            />
          </View>
        </SwipeModal>
      )}

      {/* Phone Modal */}
      {showPhoneModal && (
        <SwipeModal
          title="Phone"
          modalVisible={showPhoneModal}
          setVisible={setShowPhoneModal}
        >
          <View className="flex-1 gap-4 px-4 pb-6">
            <InputCustom
              placeholder="Enter your phone"
              value={formData.phone}
              onChangeText={(text) =>
                setFormData((p) => ({ ...p, phone: text }))
              }
              keyboardType="phone-pad"
            />
            <RippleButton title="Done" onPress={() => setShowPhoneModal(false)} />
          </View>
        </SwipeModal>
      )}

      {/* Birth date Modal */}
      {showBirthModal && (
        <SwipeModal
          title="Date of Birth"
          modalVisible={showBirthModal}
          setVisible={setShowBirthModal}
        >
          <View className="flex-1 gap-4 px-4 pb-6">
            {Platform.OS === 'web' && ReactDatePicker ? (
              <View className="w-full">
                {/* @ts-ignore dynamic import style handled in file head */}
                <ReactDatePicker
                  selected={parseDate(formData.birthDate) || new Date()}
                  onChange={(date: Date | null) =>
                    date &&
                    setFormData((p) => ({ ...p, birthDate: formatDate(date) }))
                  }
                  withPortal
                  portalId="react-datepicker-portal"
                  popperPlacement="bottom"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  scrollableYearDropdown
                  yearDropdownItemNumber={120}
                  maxDate={new Date()}
                  dateFormat="yyyy-MM-dd"
                  className="w-full rounded-md border border-border bg-bg-secondary p-3"
                />
              <View className="mt-3 flex-row gap-3">
              {formData.birthDate ? (
                <RippleButton
                  title="Clear"
                  variant="outline"
                  onPress={() => setFormData((p) => ({ ...p, birthDate: '' }))}
                />
              ) : null}
              <RippleButton title="Done" onPress={() => setShowBirthModal(false)} />
            </View>
              </View>
            ) : (
              <RNDateTimePicker
                value={parseDate(formData.birthDate) || new Date()}
                mode="date"
                display="default"
                onChange={handleBirthDateChange}
                style={{ width: '100%' }}
              />
            )}
          </View>
        </SwipeModal>
      )}

      {/* Artists Modal */}
      {showArtistsModal && (
        <SwipeModal
          title="Favorite artists"
          modalVisible={showArtistsModal}
          setVisible={setShowArtistsModal}
        >
          <View className="flex-1 px-4 pb-6">
            <TextCustom className="mb-2 opacity-70">
              Select up to 20 artists
            </TextCustom>
            <InputCustom
              placeholder={
                selectedArtists.length >= 20
                  ? 'Maximum 20 selected'
                  : 'Start typing artist name'
              }
              value={artistQuery}
              onChangeText={searchArtists}
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

            {/* Selected chips */}
            <View className="mt-3">
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

            <View className="mt-4">
              <RippleButton
                title="Done"
                onPress={() => setShowArtistsModal(false)}
              />
            </View>
          </View>
        </SwipeModal>
      )}
    </KeyboardAvoidingView>
  );
};

export default EditProfileScreen;

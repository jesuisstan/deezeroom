import { FC, forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import * as ExpoLocation from 'expo-location';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ArtistsPickerComponent from '@/components/artists/ArtistsPickerComponent';
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
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger/LoggerModule';
import { usePlaybackState } from '@/providers/PlaybackProvider';
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

// Web-only: custom input for ReactDatePicker that renders TextCustom inside
// to guarantee proper contrast in dark theme.
const DateInputButton = forwardRef<
  HTMLButtonElement,
  {
    value?: string;
    onClick?: () => void;
    placeholder?: string;
    disabled?: boolean;
  }
>(function DateInputButton({ value, onClick, placeholder, disabled }, ref) {
  return (
    // Use a real <button> so the datepicker can focus/anchor it correctly
    <button
      type="button"
      onClick={onClick}
      ref={ref as any}
      disabled={disabled}
      className="w-full rounded-md border border-border bg-bg-secondary p-3 text-left"
      style={{ cursor: 'pointer' }}
    >
      <TextCustom className={value ? '' : 'opacity-60'}>
        {value || placeholder || 'Select date'}
      </TextCustom>
    </button>
  );
});

const EditProfileScreen: FC = () => {
  const { user, profile, updateProfile } = useUser();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Add padding when mini player is visible
  const { currentTrack } = usePlaybackState();
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  // Ref to control avatar uploader
  const uploaderRef = useRef<ImageUploaderHandle>(null);
  // Scrolling ref
  const scrollRef = useRef<ScrollView>(null);

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
  // Artist picker state is managed inside reusable component. Keep only selected here.

  // Loading state for location detection
  const [locLoading, setLocLoading] = useState(false);
  // Modals visibility
  const [showNameModal, setShowNameModal] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [showArtistsModal, setShowArtistsModal] = useState(false);

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: themeColors[theme]['bg-main'] }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: bottomPadding
        }}
        className="bg-bg-main"
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="w-full flex-1 justify-between py-4"
          style={containerWidthStyle}
        >
          {/* Content group (top) */}
          <View className="gap-4">
            {/* Avatar */}
            <View className="w-full items-center gap-2 px-4">
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
            <View>
              <TextCustom type="semibold" size="xl" className="px-4">
                Personal information
              </TextCustom>

              {/* Username */}
              <LineButton onPress={() => setShowNameModal(true)}>
                <View className="w-full px-4 py-4">
                  <TextCustom
                    size="s"
                    color={themeColors[theme]['text-secondary']}
                  >
                    My Username
                  </TextCustom>
                  <TextCustom>{formData.displayName || 'Not set'}</TextCustom>
                </View>
              </LineButton>
              <Divider />

              {/* Date of Birth */}
              <LineButton onPress={() => setShowBirthModal(true)}>
                <View className="w-full px-4 py-4">
                  <TextCustom
                    size="s"
                    color={themeColors[theme]['text-secondary']}
                  >
                    Date of Birth
                  </TextCustom>
                  <TextCustom>{formData.birthDate || 'Not set'}</TextCustom>
                </View>
              </LineButton>
              <Divider />

              {/* About me */}
              <LineButton onPress={() => setShowBioModal(true)}>
                <View className="w-full px-4 py-4">
                  <TextCustom
                    size="s"
                    color={themeColors[theme]['text-secondary']}
                  >
                    About me
                  </TextCustom>
                  <TextCustom numberOfLines={1}>
                    {formData.bio || 'Tap to write'}
                  </TextCustom>
                </View>
              </LineButton>
              <Divider />

              {/* Location */}
              <LineButton onPress={() => setShowLocationModal(true)}>
                <View className="w-full px-4 py-4">
                  <TextCustom
                    size="s"
                    color={themeColors[theme]['text-secondary']}
                  >
                    Location
                  </TextCustom>
                  <TextCustom>{formData.locationName || 'Not set'}</TextCustom>
                </View>
              </LineButton>
              <Divider />

              {/* Phone */}
              <LineButton onPress={() => setShowPhoneModal(true)}>
                <View className="w-full px-4 py-4">
                  <TextCustom
                    size="s"
                    color={themeColors[theme]['text-secondary']}
                  >
                    Phone
                  </TextCustom>
                  <TextCustom>{formData.phone || 'Not set'}</TextCustom>
                </View>
              </LineButton>
              <Divider />
            </View>

            {/* Music preferences */}
            <View>
              <TextCustom type="semibold" size="xl" className="px-4">
                Music preferences
              </TextCustom>

              {/* Favorite artists */}
              <LineButton onPress={() => setShowArtistsModal(true)}>
                <View className="w-full px-4 py-4">
                  <TextCustom
                    size="s"
                    color={themeColors[theme]['text-secondary']}
                  >
                    Favorite artists
                  </TextCustom>
                  <TextCustom>
                    {selectedArtists.length > 0
                      ? `${selectedArtists.length} selected`
                      : 'None'}
                  </TextCustom>
                </View>
              </LineButton>
            </View>
          </View>

          {/* Save (bottom) */}
          <View className="mt-2 px-4">
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
            <RippleButton
              title="Done"
              onPress={() => setShowNameModal(false)}
            />
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
            <RippleButton
              title="Done"
              onPress={() => setShowPhoneModal(false)}
            />
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
                  calendarClassName="bg-bg-secondary text-[--color-text-main] border border-border"
                  popperClassName="z-50"
                  customInput={<DateInputButton placeholder="yyyy-mm-dd" />}
                />
                <View className="mt-3 flex-row gap-3">
                  {formData.birthDate ? (
                    <RippleButton
                      title="Clear"
                      variant="outline"
                      onPress={() =>
                        setFormData((p) => ({ ...p, birthDate: '' }))
                      }
                    />
                  ) : null}
                  <RippleButton
                    title="Done"
                    onPress={() => setShowBirthModal(false)}
                  />
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
          <ArtistsPickerComponent
            selected={selectedArtists}
            onChange={setSelectedArtists}
            max={20}
            isVisible={showArtistsModal}
            onDone={() => setShowArtistsModal(false)}
          />
        </SwipeModal>
      )}
    </KeyboardAvoidingView>
  );
};

export default EditProfileScreen;

import { FC, forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ArtistsPickerComponent from '@/components/artists/ArtistsPickerComponent';
import LocationPicker, {
  LocationValue
} from '@/components/location/LocationPicker';
import { Alert } from '@/components/modules/alert';
import { Logger } from '@/components/modules/logger/LoggerModule';
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
  // @ts-ignore ensure styles present when dependency installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  RNDateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {
  RNDateTimePicker = null;
}

// Guarded web datepicker import (optional dependency)
let ReactDatePicker: any = null;
if (Platform.OS === 'web') {
  try {
    // @ts-ignore ensure styles present when dependency installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ReactDatePicker = require('react-datepicker').default;
    // @ts-ignore ensure styles present when dependency installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      className="w-full rounded-md border border-border p-3 text-left"
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

  // Ref to control avatar uploader
  const uploaderRef = useRef<ImageUploaderHandle>(null);
  // Scrolling ref
  const scrollRef = useRef<ScrollView>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    // location now stored in normalized format, plus legacy fields for compatibility
    location: null as LocationValue,
    phone: '',
    birthDate: ''
  });

  // Artist selection state
  const [selectedArtists, setSelectedArtists] = useState<DeezerArtist[]>([]);
  // Artist picker state is managed inside reusable component. Keep only selected here.

  // Modals visibility
  const [showNameModal, setShowNameModal] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [showArtistsModal, setShowArtistsModal] = useState(false);

  // Add padding when mini player is visible
  const { currentTrack } = usePlaybackState();
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        location: profile.privateInfo?.location || null,
        phone: profile.privateInfo?.phone || '',
        birthDate: profile.privateInfo?.birthDate || ''
      });
      // Load selected artists details by IDs (preferred), fallback to deprecated stored objects
      const ids = profile.favoriteArtistIds;
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
        setSelectedArtists([]);
      }
    }
  }, [profile]);

  const handleImageUploaded = async (imageUrl: string) => {
    if (!user || !profile) return;
    await updateAvatar(imageUrl, profile, updateProfile);
  };

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}-${m}-${y}`;
  };
  const parseDate = (value?: string) => {
    if (!value) return null;
    const [dayStr, monthStr, yearStr] = value.split('-');
    if (!dayStr || !monthStr || !yearStr) return null;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    if (
      !Number.isInteger(day) ||
      !Number.isInteger(month) ||
      !Number.isInteger(year) ||
      day <= 0 ||
      month <= 0 ||
      month > 12
    ) {
      return null;
    }
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return parsed;
  };
  const handleBirthDateChange = (event: any, date?: Date) => {
    if (event?.type === 'dismissed') {
      setShowBirthModal(false);
      return;
    }
    if (date) {
      setFormData((prev) => ({ ...prev, birthDate: formatDate(date) }));
    }
    setShowBirthModal(false);
  };
  const handleBirthDateClear = () => {
    setFormData((prev) => ({ ...prev, birthDate: '' }));
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const updateData = {
        displayName: formData.displayName,
        bio: formData.bio,
        privateInfo: {
          phone: formData.phone,
          birthDate: formData.birthDate,
          // Write new normalized location
          location: formData.location || undefined
        },
        favoriteArtistIds: selectedArtists.slice(0, 20).map((a) => a.id)
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
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: bottomPadding
        }}
        className="bg-bg-main"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full gap-4 py-4" style={[containerWidthStyle]}>
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
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <RippleButton
                  title="Update avatar"
                  size="sm"
                  variant="primary"
                  onPress={() => uploaderRef.current?.open()}
                />
              </View>
              <View className="flex-1">
                {!!profile?.photoURL && (
                  <RippleButton
                    title="Remove"
                    size="sm"
                    variant="outline"
                    onPress={() => uploaderRef.current?.remove()}
                  />
                )}
              </View>
            </View>
          </View>
          <Divider />

          {/* Public information */}
          <View className="">
            <TextCustom type="bold" size="xl" className="px-4">
              Public information
            </TextCustom>

            {/* Username */}
            <LineButton onPress={() => setShowNameModal(true)}>
              <View className="w-full px-4 py-2">
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  My Username
                </TextCustom>
                <TextCustom>{formData.displayName || 'Not set'}</TextCustom>
              </View>
            </LineButton>
            <Divider inset />

            {/* About me */}
            <LineButton onPress={() => setShowBioModal(true)}>
              <View className="w-full px-4 py-2">
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
            <Divider inset />

            {/* Favorite artists */}
            <LineButton onPress={() => setShowArtistsModal(true)}>
              <View className="w-full px-4 py-2">
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
            <Divider />
          </View>

          {/* Private information */}
          <View className="">
            <TextCustom type="bold" size="xl" className="px-4">
              Private information
            </TextCustom>

            {/* Date of Birth */}
            <LineButton onPress={() => setShowBirthModal(true)}>
              <View className="w-full px-4 py-2">
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  Date of Birth
                </TextCustom>
                <TextCustom>{formData.birthDate || 'Not set'}</TextCustom>
              </View>
            </LineButton>
            <Divider inset />

            {/* Location */}
            <LineButton onPress={() => setShowLocationModal(true)}>
              <View className="w-full px-4 py-2">
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  Location
                </TextCustom>
                <TextCustom>
                  {formData.location?.formattedAddress || 'Not set'}
                </TextCustom>
              </View>
            </LineButton>
            <Divider inset />

            {/* Phone */}
            <LineButton onPress={() => setShowPhoneModal(true)}>
              <View className="w-full px-4 py-2">
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  Phone
                </TextCustom>
                <TextCustom>{formData.phone || 'Not set'}</TextCustom>
              </View>
            </LineButton>
          </View>

          {/* Save */}
          <View className="px-4">
            <RippleButton
              title="Save"
              size="md"
              variant="primary"
              onPress={handleSave}
              width="full"
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
          size="three-quarter"
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
              width="full"
              size="md"
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
          size="three-quarter"
        >
          <View className="flex-1 gap-4 px-4 pb-6">
            <InputCustom
              placeholder="Tell about yourself"
              value={formData.bio}
              onChangeText={(text) => setFormData((p) => ({ ...p, bio: text }))}
              multiline
            />
            <RippleButton
              title="Done"
              width="full"
              size="md"
              onPress={() => setShowBioModal(false)}
            />
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
            <LocationPicker
              value={formData.location}
              onChange={(val) =>
                setFormData((p) => ({
                  ...p,
                  location: val
                }))
              }
              placeholder="Search city, region, country"
              allowCurrentLocation
            />
            <RippleButton
              title="Done"
              width="full"
              size="md"
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
          size="three-quarter"
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
              width="full"
              size="md"
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
          size="hidden"
        >
          <View className="flex-1 gap-4 px-4 pb-6">
            {Platform.OS === 'web' && ReactDatePicker ? (
              <View className="w-full">
                {/* @ts-ignore dynamic import style handled in file head */}
                <ReactDatePicker
                  selected={parseDate(formData.birthDate)}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setFormData((p) => ({
                        ...p,
                        birthDate: formatDate(date)
                      }));
                      setShowBirthModal(false);
                    }
                  }}
                  withPortal
                  portalId="react-datepicker-portal"
                  popperPlacement="bottom"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  scrollableYearDropdown
                  yearDropdownItemNumber={120}
                  maxDate={new Date()}
                  dateFormat="dd-MM-yyyy"
                  calendarClassName=" border border-border"
                  popperClassName="z-50"
                  customInput={<DateInputButton placeholder="dd-mm-yyyy" />}
                />
                <View className="mt-3 flex-row gap-3">
                  {formData.birthDate ? (
                    <RippleButton
                      title="Clear"
                      variant="outline"
                      onPress={() => {
                        handleBirthDateClear();
                        setShowBirthModal(false);
                      }}
                    />
                  ) : null}
                  <RippleButton
                    title="Close"
                    onPress={() => setShowBirthModal(false)}
                  />
                </View>
              </View>
            ) : (
              <View className="w-full">
                <RNDateTimePicker
                  value={parseDate(formData.birthDate) || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleBirthDateChange}
                  style={{ width: '100%' }}
                  maximumDate={new Date()}
                />
                <View className="mt-3 flex-row gap-3">
                  {formData.birthDate ? (
                    <RippleButton
                      title="Clear"
                      variant="outline"
                      onPress={() => {
                        handleBirthDateClear();
                        setShowBirthModal(false);
                      }}
                    />
                  ) : null}
                  <RippleButton
                    title="Close"
                    onPress={() => setShowBirthModal(false)}
                  />
                </View>
              </View>
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

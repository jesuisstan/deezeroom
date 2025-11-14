import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import LocationPicker, {
  LocationValue
} from '@/components/location/LocationPicker';
import { Alert } from '@/components/modules/alert';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import RippleButton from '@/components/ui/buttons/RippleButton';
import DateTimePickerField from '@/components/ui/DateTimePickerField';
import ImageUploader from '@/components/ui/ImageUploader';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { db } from '@/utils/firebase/firebase-init';
import {
  EventService,
  EventVisibility,
  EventVoteLicense
} from '@/utils/firebase/firebase-service-events';
import { StorageService } from '@/utils/firebase/firebase-service-storage';
import { UserProfile } from '@/utils/firebase/firebase-service-user';

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated: (eventId: string) => void;
  userData: UserProfile;
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const MIN_EVENT_DURATION_MS = 60 * 1000;

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  visible,
  onClose,
  onEventCreated,
  userData
}) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  const [voteLicense, setVoteLicense] = useState<EventVoteLicense>('everyone');
  const [geofenceEnabled, setGeofenceEnabled] = useState<'yes' | 'no'>('no');
  const [location, setLocation] = useState<LocationValue>(null);
  const [radiusMeters, setRadiusMeters] = useState<string>('100');
  const [coverImageUri, setCoverImageUri] = useState<string>('');
  const [startAt, setStartAt] = useState<Date>(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return new Date(now.getTime());
  });
  const [endAt, setEndAt] = useState<Date>(
    () => new Date(Date.now() + SIX_HOURS_MS)
  );
  const [endError, setEndError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStartSelection, setHasStartSelection] = useState(false);
  const [durationMs, setDurationMs] = useState<number>(SIX_HOURS_MS);

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (error) {
      Logger.warn('Failed to detect timezone', error, 'CreateEventModal');
      return 'UTC';
    }
  }, []);

  const resetSchedule = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const roundedStart = new Date(
      Math.ceil(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000)
    );
    setStartAt(roundedStart);
    setEndAt(new Date(roundedStart.getTime() + SIX_HOURS_MS));
    setDurationMs(SIX_HOURS_MS);
    setEndError(null);
    // Set hasStartSelection to true since we're automatically setting the start time
    setHasStartSelection(true);
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setVisibility('public');
    setVoteLicense('everyone');
    setGeofenceEnabled('no');
    setLocation(null);
    setRadiusMeters('100');
    setCoverImageUri('');
    resetSchedule();
    onClose();
  };

  useEffect(() => {
    if (visible) {
      // Only reset schedule when modal opens, not when visibility/voteLicense changes
      resetSchedule();
      // Auto-adjust voteLicense if needed
      if (visibility === 'private' && voteLicense === 'everyone') {
        setVoteLicense('invited');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Auto-adjust voteLicense only when switching to private
  useEffect(() => {
    if (visibility === 'private') {
      // For private events, "invited" makes more sense as default
      setVoteLicense('invited');
    }
    // Don't auto-change when switching to public - let user choose
  }, [visibility]);

  const handleStartChange = (next: Date) => {
    let adjusted = new Date(next);
    adjusted.setSeconds(0, 0);
    const now = new Date();
    now.setSeconds(0, 0);
    if (adjusted < now) {
      adjusted = now;
    }
    setHasStartSelection(true);
    setStartAt(adjusted);
    const effectiveDuration = Math.max(durationMs, MIN_EVENT_DURATION_MS);
    const newEnd = new Date(adjusted.getTime() + effectiveDuration);
    setEndAt(newEnd);
    setDurationMs(effectiveDuration);
    setEndError(null);
  };

  const handleEndChange = (next: Date) => {
    let adjusted = new Date(next);
    adjusted.setSeconds(0, 0);
    if (adjusted <= startAt) {
      setEndError('End time must be after start time');
      Alert.alert('Invalid Date', 'End time must be after start time');
      return;
    }
    const diff = adjusted.getTime() - startAt.getTime();
    if (diff < MIN_EVENT_DURATION_MS) {
      setEndError('Event duration must be at least 1 minute');
      Alert.alert(
        'Invalid Duration',
        'Event duration must be at least 1 minute'
      );
      return;
    }
    setEndAt(adjusted);
    setDurationMs(diff);
    setEndError(null);
  };

  const handleCreateEvent = async () => {
    // Validate name
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter event name');
      return;
    }

    // Validate start and end dates
    if (!startAt || !endAt) {
      Alert.alert('Validation Error', 'Please select both start and end dates');
      return;
    }

    // Validate schedule
    if (endError) {
      Alert.alert('Invalid Schedule', endError);
      return;
    }

    const now = new Date();
    if (startAt < now) {
      Alert.alert('Invalid Schedule', 'Start time must be in the future');
      return;
    }

    if (endAt <= startAt) {
      Alert.alert('Invalid Schedule', 'End time must be later than start time');
      return;
    }

    // Validate geofence if enabled
    if (geofenceEnabled === 'yes') {
      if (!location?.coords) {
        Alert.alert(
          'Validation Error',
          'Please select a location for geofence'
        );
        return;
      }
      if (!radiusMeters.trim()) {
        Alert.alert('Validation Error', 'Please enter a radius for geofence');
        return;
      }
      const radius = parseFloat(radiusMeters);
      if (isNaN(radius) || radius <= 0) {
        Alert.alert(
          'Validation Error',
          'Please enter a valid radius (must be greater than 0 meters)'
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      const geofence =
        geofenceEnabled === 'yes' && location?.coords
          ? {
              latitude: location.coords.lat,
              longitude: location.coords.lng,
              radiusMeters: parseFloat(radiusMeters),
              locationName:
                location.formattedAddress || location.description || undefined
            }
          : undefined;

      const eventId = await EventService.createEvent(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          coverImageUrl: undefined,
          visibility,
          voteLicense,
          geofence,
          startAt,
          endAt,
          timezone
        },
        userData.uid,
        [],
        { displayName: userData.displayName }
      );

      if (coverImageUri) {
        try {
          const coverUrl = await StorageService.uploadEventCover(
            eventId,
            coverImageUri
          );
          await updateDoc(doc(db, 'events', eventId), {
            coverImageUrl: coverUrl,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          Logger.error('Error uploading event cover:', error);
          Notifier.shoot({
            type: 'warn',
            title: 'Warning',
            message: 'Event created but cover upload failed'
          });
        }
      }

      onEventCreated(eventId);
      handleClose();
      Notifier.shoot({
        type: 'success',
        title: 'Success',
        message: `Event "${name}" created`
      });
    } catch (error) {
      Logger.error('Error creating event:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to create event'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SwipeModal
      title="Create Event"
      modalVisible={visible}
      setVisible={onClose}
      onClose={handleClose}
      disableSwipe
    >
      <View className="flex-1 gap-4 px-4 pb-4">
        <View className="items-center">
          <ImageUploader
            currentImageUrl={coverImageUri}
            onImageUploaded={setCoverImageUri}
            placeholder="Add Cover"
            size="md"
            shape="square"
          />
        </View>

        <View>
          <InputCustom
            label="Name *"
            value={name}
            onChangeText={setName}
            placeholder="Enter event name"
            variant="default"
          />
        </View>

        <View>
          <InputCustom
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Event description (optional)"
            multiline
            numberOfLines={3}
            variant="default"
          />
        </View>

        <View className="gap-4">
          <DateTimePickerField
            label="Start *"
            value={startAt}
            onChange={handleStartChange}
            minimumDate={new Date()}
            timezoneLabel={timezone}
            helperText={undefined}
            onOpen={() => setHasStartSelection(true)}
          />

          <DateTimePickerField
            label="End *"
            value={endAt}
            onChange={handleEndChange}
            minimumDate={new Date(startAt.getTime() + 15 * 60 * 1000)}
            timezoneLabel={timezone}
            helperText={
              !hasStartSelection
                ? 'Select start time first'
                : endError || undefined
            }
            disabled={!hasStartSelection}
          />
        </View>

        <View>
          <TextCustom className="mb-2" type="bold">
            Visibility
          </TextCustom>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setVisibility('public')}
              className="flex-1 rounded-xl border p-1"
              style={{
                backgroundColor:
                  visibility === 'public'
                    ? `${themeColors[theme]['primary']}15`
                    : themeColors[theme]['bg-main'],
                borderColor:
                  visibility === 'public'
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['border']
              }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <MaterialCommunityIcons
                  name="earth"
                  size={18}
                  color={
                    visibility === 'public'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  size="s"
                  color={
                    visibility === 'public'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-main']
                  }
                >
                  Public
                </TextCustom>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setVisibility('private')}
              className="flex-1 rounded-xl border p-1"
              style={{
                backgroundColor:
                  visibility === 'private'
                    ? `${themeColors[theme]['primary']}15`
                    : themeColors[theme]['bg-main'],
                borderColor:
                  visibility === 'private'
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['border']
              }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <MaterialCommunityIcons
                  name="lock"
                  size={18}
                  color={
                    visibility === 'private'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  size="s"
                  color={
                    visibility === 'private'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-main']
                  }
                >
                  Private
                </TextCustom>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Vote Permissions */}
        <View>
          <TextCustom className="mb-2" type="bold">
            Vote Permissions
          </TextCustom>
          {visibility === 'private' ? (
            // For private events, only "Invited Only" is allowed
            <View
              className="rounded-xl border p-1"
              style={{
                backgroundColor: `${themeColors[theme]['primary']}15`,
                borderColor: themeColors[theme]['primary']
              }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <MaterialCommunityIcons
                  name="account-plus"
                  size={18}
                  color={themeColors[theme]['primary']}
                />
                <TextCustom
                  type="bold"
                  size="s"
                  color={themeColors[theme]['primary']}
                >
                  Invited Only
                </TextCustom>
              </View>
            </View>
          ) : (
            // For public events, show both options
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setVoteLicense('everyone')}
                className="flex-1 rounded-xl border p-1"
                style={{
                  backgroundColor:
                    voteLicense === 'everyone'
                      ? `${themeColors[theme]['primary']}15`
                      : themeColors[theme]['bg-main'],
                  borderColor:
                    voteLicense === 'everyone'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['border']
                }}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <MaterialCommunityIcons
                    name="account-group"
                    size={18}
                    color={
                      voteLicense === 'everyone'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-secondary']
                    }
                  />
                  <TextCustom
                    type="bold"
                    size="s"
                    color={
                      voteLicense === 'everyone'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-main']
                    }
                  >
                    Everyone
                  </TextCustom>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setVoteLicense('invited')}
                className="flex-1 rounded-xl border p-1"
                style={{
                  backgroundColor:
                    voteLicense === 'invited'
                      ? `${themeColors[theme]['primary']}15`
                      : themeColors[theme]['bg-main'],
                  borderColor:
                    voteLicense === 'invited'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['border']
                }}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <MaterialCommunityIcons
                    name="account-plus"
                    size={18}
                    color={
                      voteLicense === 'invited'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-secondary']
                    }
                  />
                  <TextCustom
                    type="bold"
                    size="s"
                    color={
                      voteLicense === 'invited'
                        ? themeColors[theme]['primary']
                        : themeColors[theme]['text-main']
                    }
                  >
                    Invited Only
                  </TextCustom>
                </View>
              </Pressable>
            </View>
          )}

          {/* Detailed explanations */}
          <View className="mt-2 gap-1">
            <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
              {visibility === 'private'
                ? '• Only invited users can vote in this private event'
                : voteLicense === 'everyone'
                  ? '• All users can vote in this public event'
                  : '• Only invited users can vote in this public event'}
            </TextCustom>
          </View>
        </View>

        {/* Geofence Settings */}
        <View>
          <TextCustom className="mb-2" type="bold">
            Geofence
          </TextCustom>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setGeofenceEnabled('yes')}
              className="flex-1 rounded-xl border p-1"
              style={{
                backgroundColor:
                  geofenceEnabled === 'yes'
                    ? `${themeColors[theme]['primary']}15`
                    : themeColors[theme]['bg-main'],
                borderColor:
                  geofenceEnabled === 'yes'
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['border']
              }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={
                    geofenceEnabled === 'yes'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  size="s"
                  color={
                    geofenceEnabled === 'yes'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-main']
                  }
                >
                  Yes
                </TextCustom>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                setGeofenceEnabled('no');
                setLocation(null);
              }}
              className="flex-1 rounded-xl border p-1"
              style={{
                backgroundColor:
                  geofenceEnabled === 'no'
                    ? `${themeColors[theme]['primary']}15`
                    : themeColors[theme]['bg-main'],
                borderColor:
                  geofenceEnabled === 'no'
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['border']
              }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={
                    geofenceEnabled === 'no'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  size="s"
                  color={
                    geofenceEnabled === 'no'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-main']
                  }
                >
                  No
                </TextCustom>
              </View>
            </Pressable>
          </View>
          <TextCustom
            size="xs"
            color={themeColors[theme]['text-secondary']}
            className="mt-1"
          >
            {geofenceEnabled === 'yes'
              ? 'Only users within the specified radius can participate in this event.'
              : 'No location restriction for this event.'}
          </TextCustom>

          {geofenceEnabled === 'yes' && (
            <View className="mt-4 gap-4">
              <LocationPicker
                value={location}
                onChange={setLocation}
                placeholder="Select event location"
                allowCurrentLocation={true}
              />
              <View>
                <InputCustom
                  label="Radius (meters) *"
                  value={radiusMeters}
                  onChangeText={setRadiusMeters}
                  placeholder="Enter radius in meters"
                  keyboardType="numeric"
                  variant="default"
                />
              </View>
            </View>
          )}
        </View>

        <View className="">
          <RippleButton
            title="Create event"
            onPress={handleCreateEvent}
            loading={isLoading}
            width="full"
            disabled={
              !name.trim() ||
              isLoading ||
              (geofenceEnabled === 'yes' &&
                (!location?.coords ||
                  !radiusMeters.trim() ||
                  isNaN(parseFloat(radiusMeters)) ||
                  parseFloat(radiusMeters) <= 0))
            }
          />
        </View>
      </View>
    </SwipeModal>
  );
};

export default CreateEventModal;

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View
} from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import UserChip from '@/components/profile-users/UserChip';
import RippleButton from '@/components/ui/buttons/RippleButton';
import TabButton from '@/components/ui/buttons/TabButton';
import DateTimePickerField from '@/components/ui/DateTimePickerField';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { Event, EventService } from '@/utils/firebase/firebase-service-events';
import { getPublicProfilesByUserIds } from '@/utils/firebase/firebase-service-profiles';

interface EditEventModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
  onEventUpdated: () => void;
}

interface ParticipantWithProfile {
  uid: string;
  displayName?: string;
  photoURL?: string;
}

const MIN_EVENT_DURATION_MS = 15 * 60 * 1000; // Minimum duration: 15 minutes

const EditEventModal: React.FC<EditEventModalProps> = ({
  visible,
  onClose,
  event,
  onEventUpdated
}) => {
  const { user } = useUser();
  const { theme } = useTheme();

  const [name, setName] = useState(event.name || '');
  const [description, setDescription] = useState(event.description || '');
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStartSelection, setHasStartSelection] = useState(false);

  // Delegation state
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>(
    []
  );
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showDelegateDropdown, setShowDelegateDropdown] = useState(false);
  const [selectedNewHost, setSelectedNewHost] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'hosting'>('details');

  const timezone = useMemo(() => {
    try {
      return (
        event.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        'UTC'
      );
    } catch (error) {
      Logger.warn('Failed to detect timezone', error, 'EditEventModal');
      return event.timezone || 'UTC';
    }
  }, [event.timezone]);

  const hasEventStarted = useMemo(() => {
    return EventService.hasEventStarted(event);
  }, [event]);

  const isCurrentUserHost = useMemo(() => {
    if (!user) return false;
    return event.hostIds?.includes(user.uid) ?? false;
  }, [event.hostIds, user]);

  // Get other participants (exclude current user and other hosts)
  const otherParticipants = useMemo(() => {
    if (!user) return [];
    return event.participantIds.filter(
      (id) => id !== user.uid && !event.hostIds.includes(id)
    );
  }, [event.participantIds, event.hostIds, user]);

  // Initialize dates from event
  useEffect(() => {
    if (visible && event) {
      setName(event.name || '');
      setDescription(event.description || '');

      const start = event.startAt ? new Date(event.startAt as any) : null;
      const end = event.endAt ? new Date(event.endAt as any) : null;

      setStartAt(start);
      setEndAt(end);
      setHasStartSelection(!!start);
      setEndError(null);
      setShowDelegateDropdown(false);
      setSelectedNewHost(null);
      setActiveTab('details');
    }
  }, [visible, event]);

  // Load participants with profiles
  useEffect(() => {
    if (!visible || otherParticipants.length === 0) {
      setParticipants([]);
      return;
    }

    const loadParticipants = async () => {
      setLoadingParticipants(true);
      try {
        const profilesMap = await getPublicProfilesByUserIds(otherParticipants);

        const participantsList: ParticipantWithProfile[] =
          otherParticipants.map((uid) => {
            const profile = profilesMap.get(uid);
            return {
              uid,
              displayName: profile?.displayName,
              photoURL: profile?.photoURL
            };
          });

        setParticipants(participantsList);
      } catch (error) {
        Logger.error('Error loading participants:', error);
      } finally {
        setLoadingParticipants(false);
      }
    };

    loadParticipants();
  }, [visible, otherParticipants]);

  const handleStartChange = (next: Date) => {
    let adjusted = new Date(next);
    adjusted.setSeconds(0, 0);

    // If event hasn't started, allow changing start time
    if (!hasEventStarted) {
      const now = new Date();
      now.setSeconds(0, 0);
      if (adjusted < now) {
        adjusted = now;
      }
    } else {
      // If event has started, don't allow changing start time
      Alert.alert(
        'Cannot Change Start Time',
        'Event has already started. Start time cannot be changed.'
      );
      return;
    }

    setHasStartSelection(true);
    setStartAt(adjusted);

    // Adjust end time if needed
    if (endAt && adjusted) {
      if (endAt <= adjusted) {
        // End must be after start, adjust it
        const newEnd = new Date(adjusted.getTime() + MIN_EVENT_DURATION_MS);
        setEndAt(newEnd);
      }
    }

    setEndError(null);
  };

  const handleEndChange = (next: Date) => {
    let adjusted = new Date(next);
    adjusted.setSeconds(0, 0);

    if (!startAt) {
      setEndError('Please select start time first');
      Alert.alert('Invalid Date', 'Please select start time first');
      return;
    }

    const now = new Date();
    now.setSeconds(0, 0);

    if (adjusted < now) {
      setEndError('End time must be in the future');
      Alert.alert('Invalid Date', 'End time must be in the future');
      return;
    }

    if (adjusted <= startAt) {
      setEndError('End time must be after start time');
      Alert.alert('Invalid Date', 'End time must be after start time');
      return;
    }

    const diff = adjusted.getTime() - startAt.getTime();
    if (diff < MIN_EVENT_DURATION_MS) {
      setEndError('Event duration must be at least 15 minutes');
      Alert.alert(
        'Invalid Duration',
        'Event duration must be at least 15 minutes'
      );
      return;
    }

    setEndAt(adjusted);
    setEndError(null);
  };

  const handleDelegateHosting = () => {
    if (!user || !selectedNewHost) return;

    Alert.confirm(
      'Delegate Hosting Rights?',
      'Are you sure you want to delegate hosting rights? You will become a regular participant and lose host privileges.',
      async () => {
        setIsLoading(true);
        try {
          await EventService.delegateHosting(
            event.id,
            user.uid,
            selectedNewHost
          );

          Notifier.shoot({
            type: 'success',
            title: 'Success',
            message: 'Hosting rights delegated successfully'
          });

          onEventUpdated();
          onClose();
        } catch (error) {
          Logger.error('Error delegating hosting:', error);
          Notifier.shoot({
            type: 'error',
            title: 'Error',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to delegate hosting'
          });
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter event name');
      return;
    }

    if (!startAt || !endAt) {
      Alert.alert('Validation Error', 'Please select both start and end dates');
      return;
    }

    if (endError) {
      Alert.alert('Invalid Schedule', endError);
      return;
    }

    const now = new Date();

    // Validate startAt only if we're updating it (event hasn't started)
    if (!hasEventStarted && startAt) {
      if (startAt < now) {
        Alert.alert('Invalid Schedule', 'Start time must be in the future');
        return;
      }
    }

    if (endAt <= startAt) {
      Alert.alert('Invalid Schedule', 'End time must be later than start time');
      return;
    }

    // Validate endAt - must be in the future
    if (endAt < now) {
      Alert.alert('Invalid Schedule', 'End time must be in the future');
      return;
    }

    setIsLoading(true);
    try {
      const updates: {
        name: string;
        description?: string;
        startAt?: Date;
        endAt?: Date;
      } = {
        name: name.trim()
      };

      if (description.trim()) {
        updates.description = description.trim();
      } else {
        updates.description = undefined;
      }

      // Only update startAt if event hasn't started
      if (!hasEventStarted && startAt) {
        updates.startAt = startAt;
      }

      // Always allow updating endAt (if valid)
      if (endAt) {
        updates.endAt = endAt;
      }

      await EventService.updateEvent(event.id, updates);

      Notifier.shoot({
        type: 'success',
        title: 'Success',
        message: 'Event updated successfully'
      });

      onEventUpdated();
      onClose();
    } catch (error) {
      Logger.error('Error updating event:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to update event'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDetailsContent = () => (
    <>
      {/* Name Input */}
      <View>
        <InputCustom
          label="Name *"
          value={name}
          onChangeText={setName}
          placeholder="Enter event name"
          variant="default"
        />
      </View>

      {/* Description Input */}
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

      {/* Date/Time Pickers */}
      <View className="gap-4">
        <DateTimePickerField
          label="Start *"
          value={startAt || new Date()}
          onChange={handleStartChange}
          minimumDate={hasEventStarted ? undefined : new Date()}
          timezoneLabel={timezone}
          helperText={
            hasEventStarted
              ? 'Event has started. Start time cannot be changed.'
              : undefined
          }
          disabled={hasEventStarted}
          onOpen={() => setHasStartSelection(true)}
        />

        <DateTimePickerField
          label="End *"
          value={endAt || new Date()}
          onChange={handleEndChange}
          minimumDate={
            startAt
              ? new Date(
                  Math.max(
                    startAt.getTime() + MIN_EVENT_DURATION_MS,
                    Date.now()
                  )
                )
              : new Date()
          }
          timezoneLabel={timezone}
          helperText={
            !hasStartSelection
              ? 'Select start time first'
              : endError || undefined
          }
          disabled={!hasStartSelection}
        />
      </View>

      {/* Action Button */}
      <View className="mt-4">
        <RippleButton
          title="Save Changes"
          size="md"
          onPress={handleSave}
          loading={isLoading}
          disabled={isLoading || !name.trim()}
          width="full"
        />
      </View>
    </>
  );

  const renderHostingContent = () => (
    <>
      {!isCurrentUserHost ? (
        <View className="items-center justify-center py-8">
          <MaterialCommunityIcons
            name="shield-lock"
            size={48}
            color={themeColors[theme]['text-secondary']}
          />
          <TextCustom
            size="l"
            color={themeColors[theme]['text-secondary']}
            className="mt-4 text-center"
          >
            Only hosts can manage hosting rights
          </TextCustom>
        </View>
      ) : participants.length === 0 ? (
        <View className="items-center justify-center py-8">
          <MaterialCommunityIcons
            name="account-off"
            size={48}
            color={themeColors[theme]['text-secondary']}
          />
          <TextCustom
            size="l"
            color={themeColors[theme]['text-secondary']}
            className="mt-4 text-center"
          >
            No other participants to delegate to
          </TextCustom>
          <TextCustom
            size="m"
            color={themeColors[theme]['text-secondary']}
            className="mt-2 text-center"
          >
            Invite participants to your event first
          </TextCustom>
        </View>
      ) : (
        <View className="gap-4">
          {/* Info Section */}
          <View
            className="rounded-md border p-4"
            style={{
              backgroundColor: themeColors[theme]['intent-warning'] + '22',
              borderColor: themeColors[theme]['intent-warning']
            }}
          >
            <View className="mb-3 flex-row items-center gap-2">
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={themeColors[theme]['primary']}
              />
              <TextCustom
                type="semibold"
                size="m"
                color={themeColors[theme]['intent-warning']}
              >
                About Hosting Delegation
              </TextCustom>
            </View>
            <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
              Transfer hosting rights to another participant. You will become a
              regular participant and lose host privileges.
            </TextCustom>
          </View>

          {/* Delegate Section */}
          <View className="rounded-md border border-border bg-bg-secondary p-4">
            <View className="mb-3 flex-row items-center gap-2">
              <MaterialCommunityIcons
                name="account-arrow-right"
                size={20}
                color={themeColors[theme]['text-main']}
              />
              <TextCustom type="semibold" size="m">
                Select New Host
              </TextCustom>
            </View>

            {/* Dropdown Toggle */}
            <Pressable
              onPress={() => setShowDelegateDropdown(!showDelegateDropdown)}
              className="rounded-md border border-border bg-bg-main p-3"
            >
              <View className="flex-row items-center justify-between">
                <TextCustom
                  size="m"
                  color={
                    selectedNewHost
                      ? themeColors[theme]['text-main']
                      : themeColors[theme]['text-secondary']
                  }
                >
                  {selectedNewHost
                    ? participants.find((p) => p.uid === selectedNewHost)
                        ?.displayName || 'Selected Participant'
                    : 'Choose a participant'}
                </TextCustom>
                <MaterialCommunityIcons
                  name={showDelegateDropdown ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={themeColors[theme]['text-secondary']}
                />
              </View>
            </Pressable>

            {/* Dropdown List */}
            {showDelegateDropdown && (
              <View className="mt-2 flex-row flex-wrap gap-2 rounded-md border border-border bg-bg-main p-2">
                {loadingParticipants ? (
                  <View className="w-full items-center py-4">
                    <ActivityIndicator
                      size="small"
                      color={themeColors[theme]['primary']}
                    />
                  </View>
                ) : (
                  participants.map((participant) => (
                    <UserChip
                      key={participant.uid}
                      user={{
                        uid: participant.uid,
                        displayName: participant.displayName,
                        photoURL: participant.photoURL
                      }}
                      onPress={() => {
                        setSelectedNewHost(participant.uid);
                        setShowDelegateDropdown(false);
                      }}
                      className={
                        selectedNewHost === participant.uid
                          ? 'border-2 border-primary'
                          : ''
                      }
                      rightAccessory={
                        selectedNewHost === participant.uid ? (
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={18}
                            color={themeColors[theme]['primary']}
                          />
                        ) : null
                      }
                    />
                  ))
                )}
              </View>
            )}

            {/* Delegate Button */}
            {selectedNewHost && (
              <View className="mt-3">
                <RippleButton
                  title="Confirm Delegation"
                  size="md"
                  onPress={handleDelegateHosting}
                  loading={isLoading}
                  disabled={isLoading}
                  width="full"
                />
              </View>
            )}
          </View>
        </View>
      )}
    </>
  );

  return (
    <SwipeModal
      modalVisible={visible}
      setVisible={(v) => {
        if (!v) onClose();
      }}
      onClose={onClose}
      title="Edit Event"
      disableSwipe
    >
      <View className="flex-1">
        {/* Tabs Header */}
        <View
          className="flex-row gap-2 px-4 py-2"
          style={{ backgroundColor: themeColors[theme]['bg-main'] + '15' }}
        >
          <TabButton
            title="Details"
            isActive={activeTab === 'details'}
            onPress={() => setActiveTab('details')}
          />
          <TabButton
            title="Hosting"
            isActive={activeTab === 'hosting'}
            onPress={() => setActiveTab('hosting')}
          />
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {activeTab === 'details'
              ? renderDetailsContent()
              : renderHostingContent()}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SwipeModal>
  );
};

export default EditEventModal;

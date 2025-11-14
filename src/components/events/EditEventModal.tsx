import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Alert } from '@/components/modules/alert';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import RippleButton from '@/components/ui/buttons/RippleButton';
import DateTimePickerField from '@/components/ui/DateTimePickerField';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { Event, EventService } from '@/utils/firebase/firebase-service-events';

interface EditEventModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
  onEventUpdated: () => void;
}

const MIN_EVENT_DURATION_MS = 60 * 1000;

const EditEventModal: React.FC<EditEventModalProps> = ({
  visible,
  onClose,
  event,
  onEventUpdated
}) => {
  const [name, setName] = useState(event.name || '');
  const [description, setDescription] = useState(event.description || '');
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStartSelection, setHasStartSelection] = useState(false);

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
    }
  }, [visible, event]);

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
      setEndError('Event duration must be at least 1 minute');
      Alert.alert(
        'Invalid Duration',
        'Event duration must be at least 1 minute'
      );
      return;
    }

    setEndAt(adjusted);
    setEndError(null);
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SwipeModal>
  );
};

export default EditEventModal;

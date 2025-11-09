import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import RippleButton from '@/components/ui/buttons/RippleButton';
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
  const [coverImageUri, setCoverImageUri] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setName('');
    setDescription('');
    setVisibility('public');
    setVoteLicense('everyone');
    setCoverImageUri('');
    onClose();
  };

  useEffect(() => {
    if (visible && visibility === 'private' && voteLicense === 'everyone') {
      setVoteLicense('invited');
    }
  }, [visible, visibility, voteLicense]);

  const handleCreateEvent = async () => {
    if (!name.trim()) {
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Please enter event name'
      });
      return;
    }

    setIsLoading(true);
    try {
      const eventId = await EventService.createEvent(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          coverImageUrl: undefined,
          visibility,
          voteLicense
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
    >
      <View className="flex-1 gap-4 px-4 py-4">
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
          <TextCustom className="mb-2" type="bold">
            Name *
          </TextCustom>
          <InputCustom
            value={name}
            onChangeText={setName}
            placeholder="Enter event name"
            variant="default"
          />
        </View>

        <View>
          <TextCustom className="mb-2" type="bold">
            Description
          </TextCustom>
          <InputCustom
            value={description}
            onChangeText={setDescription}
            placeholder="Event description (optional)"
            multiline
            numberOfLines={3}
            variant="default"
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

        <View>
          <TextCustom className="mb-2" type="bold">
            Vote Permissions
          </TextCustom>
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
                  Invited only
                </TextCustom>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setVoteLicense('geofence')}
              className="flex-1 rounded-xl border p-1"
              style={{
                backgroundColor:
                  voteLicense === 'geofence'
                    ? `${themeColors[theme]['primary']}15`
                    : themeColors[theme]['bg-main'],
                borderColor:
                  voteLicense === 'geofence'
                    ? themeColors[theme]['primary']
                    : themeColors[theme]['border']
              }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <MaterialCommunityIcons
                  name="map-marker-radius"
                  size={18}
                  color={
                    voteLicense === 'geofence'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-secondary']
                  }
                />
                <TextCustom
                  type="bold"
                  size="s"
                  color={
                    voteLicense === 'geofence'
                      ? themeColors[theme]['primary']
                      : themeColors[theme]['text-main']
                  }
                >
                  Geofence
                </TextCustom>
              </View>
            </Pressable>
          </View>
          <TextCustom
            size="xs"
            color={themeColors[theme]['text-secondary']}
            className="mt-1"
          >
            {voteLicense === 'everyone'
              ? 'All authenticated users can vote.'
              : voteLicense === 'invited'
                ? 'Only invited participants may vote.'
                : 'Requires participants within the defined location. Enforcement handled on device.'}
          </TextCustom>
        </View>

        <View className="mt-4">
          <RippleButton
            title="Create event"
            onPress={handleCreateEvent}
            loading={isLoading}
            width="full"
            disabled={!name.trim() || isLoading}
          />
        </View>
      </View>
    </SwipeModal>
  );
};

export default CreateEventModal;

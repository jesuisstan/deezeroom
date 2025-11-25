import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

import LocationPicker, {
  LocationValue
} from '@/components/location/LocationPicker';
import RippleButton from '@/components/ui/buttons/RippleButton';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import {
  EventInvitation,
  EventService
} from '@/utils/firebase/firebase-service-events';
import { UserProfile } from '@/utils/firebase/firebase-service-user';
import { checkGeofenceAccess, formatRadius } from '@/utils/geofence-utils';

interface EventInvitationCardProps {
  invitation: EventInvitation;
  profile: UserProfile;
  animatedStyle: any;
  processingEventInvitations: Set<string>;
  onAccept: (invitation: EventInvitation) => Promise<void>;
  onDecline: (invitation: EventInvitation) => Promise<void>;
}

export const EventInvitationCard = ({
  invitation,
  profile,
  animatedStyle,
  processingEventInvitations,
  onAccept,
  onDecline
}: EventInvitationCardProps) => {
  const [eventData, setEventData] = useState<any>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [temporaryLocation, setTemporaryLocation] = useState<LocationValue>(
    profile?.privateInfo?.location
      ? {
          placeId: profile.privateInfo.location.placeId,
          formattedAddress: profile.privateInfo.location.formattedAddress,
          description: profile.privateInfo.location.description,
          coords: profile.privateInfo.location.coords,
          addressComponents: profile.privateInfo.location.addressComponents,
          locality: profile.privateInfo.location.locality,
          adminArea: profile.privateInfo.location.adminArea,
          country: profile.privateInfo.location.country,
          countryCode: profile.privateInfo.location.countryCode
        }
      : null
  );
  const { theme } = useTheme();

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setIsLoadingEvent(true);
        setLoadError(null);
        const event = await EventService.getEvent(invitation.eventId);
        setEventData(event);
      } catch (error) {
        Logger.error('Error loading event for invitation:', error);
        setLoadError(
          error instanceof Error ? error : new Error('Failed to load event')
        );
      } finally {
        setIsLoadingEvent(false);
      }
    };
    loadEvent();
  }, [invitation.eventId]);

  if (isLoadingEvent) {
    return (
      <Animated.View style={animatedStyle}>
        <View className="rounded-md border border-border bg-bg-secondary px-4 py-3">
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="party-popper"
              size={18}
              color={themeColors[theme]['primary']}
              style={{ marginRight: 8 }}
            />
            <TextCustom
              type="semibold"
              size="m"
              color={themeColors[theme]['text-main']}
            >
              Event Invitation
            </TextCustom>
          </View>
          <View className="mt-2 flex-row items-center justify-center py-2">
            <ActivityIndicator
              size="small"
              color={themeColors[theme]['primary']}
            />
          </View>
        </View>
      </Animated.View>
    );
  }

  if (loadError || !eventData) {
    return (
      <Animated.View style={animatedStyle}>
        <View className="rounded-md border border-border bg-bg-secondary px-4 py-3">
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="party-popper"
              size={18}
              color={themeColors[theme]['primary']}
              style={{ marginRight: 8 }}
            />
            <TextCustom
              type="semibold"
              size="m"
              color={themeColors[theme]['text-main']}
            >
              Event Invitation
            </TextCustom>
          </View>
          <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
            {`You've been invited to join ${invitation.eventName ? `"${invitation.eventName}"` : 'an'} event.`}
          </TextCustom>
          <TextCustom size="xs" color={themeColors[theme]['intent-error']}>
            Failed to load event details. The event may have been deleted.
          </TextCustom>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <RippleButton
                title="Delete"
                size="sm"
                variant="outline"
                loading={processingEventInvitations.has(invitation.id)}
                disabled={processingEventInvitations.has(invitation.id)}
                onPress={() => onDecline(invitation)}
                width="full"
              />
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }

  const hasGeofence = eventData?.geofence != null;
  const hasUserLocation = temporaryLocation?.coords != null;
  const eventEnded = eventData ? EventService.hasEventEnded(eventData) : false;

  // Check geofence access using current or temporary location
  const geofenceCheck = checkGeofenceAccess(
    temporaryLocation?.coords || profile?.privateInfo?.location?.coords,
    eventData?.geofence,
    false // User is not yet a participant
  );

  const handleAcceptInvitation = async () => {
    if (eventEnded) {
      onDecline(invitation);
      return;
    }

    // Check geofence if event has geofence restrictions
    if (hasGeofence) {
      if (!geofenceCheck.canAccess) {
        // Show alert explaining the issue
        const message =
          geofenceCheck.reason === 'Location not set'
            ? `This event requires you to be within ${formatRadius(eventData.geofence.radiusMeters)} of ${eventData.geofence.locationName || 'the event location'}.`
            : `You are currently ${geofenceCheck.formattedDistance || 'too far'} away from ${eventData.geofence.locationName || 'the event location'}. You need to be within ${formatRadius(eventData.geofence.radiusMeters)}.`;

        Alert.confirm(
          'Location Required',
          message,
          () => {
            // User wants to set/update location
            setShowLocationModal(true);
          },
          () => {
            // User cancelled
          }
        );
        return;
      }
    }

    // If geofence check passed, proceed with acceptance
    await onAccept(invitation);
  };

  const handleLocationChange = (newLocation: LocationValue) => {
    setTemporaryLocation(newLocation);
  };

  const handleSaveLocation = async () => {
    // Save location to user profile
    if (temporaryLocation?.coords) {
      try {
        const { UserService } = await import(
          '@/utils/firebase/firebase-service-user'
        );
        await UserService.updateUserLocation(profile.uid, {
          placeId: temporaryLocation.placeId,
          formattedAddress: temporaryLocation.formattedAddress,
          description: temporaryLocation.description,
          coords: temporaryLocation.coords,
          addressComponents: temporaryLocation.addressComponents,
          locality: temporaryLocation.locality,
          adminArea: temporaryLocation.adminArea,
          country: temporaryLocation.country,
          countryCode: temporaryLocation.countryCode
        });

        // Close modal
        setShowLocationModal(false);

        // Re-check geofence and auto-accept if now valid
        const newGeofenceCheck = checkGeofenceAccess(
          temporaryLocation.coords,
          eventData?.geofence,
          false
        );

        Logger.info(
          'Geofence check after location save',
          {
            userCoords: temporaryLocation.coords,
            eventCoords: {
              lat: eventData?.geofence?.latitude,
              lng: eventData?.geofence?.longitude
            },
            radius: eventData?.geofence?.radiusMeters,
            distance: newGeofenceCheck.distance,
            formattedDistance: newGeofenceCheck.formattedDistance,
            canAccess: newGeofenceCheck.canAccess,
            reason: newGeofenceCheck.reason
          },
          '📍 EventInvitationCard'
        );

        if (newGeofenceCheck.canAccess) {
          // Auto-accept invitation
          await onAccept(invitation);
        } else {
          // Still outside radius
          const locationName =
            eventData.geofence.locationName || 'the event location';
          const distanceText = newGeofenceCheck.formattedDistance
            ? `You are ${newGeofenceCheck.formattedDistance} away from ${locationName}.`
            : `You are too far from ${locationName}.`;

          Alert.alert(
            'Too Far Away',
            `${distanceText} You need to be within ${formatRadius(eventData.geofence.radiusMeters)} to join.`
          );
        }
      } catch (error) {
        Logger.error('Error saving location:', error);
        Alert.alert('Error', 'Failed to save location. Please try again.');
      }
    } else {
      Alert.alert('Error', 'Please select a valid location.');
    }
  };

  return (
    <>
      <SwipeModal
        title="Set Your Location"
        modalVisible={showLocationModal}
        setVisible={() => setShowLocationModal(false)}
        onClose={() => setShowLocationModal(false)}
      >
        <View className="gap-4 px-4 pb-4">
          <View>
            <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
              This event requires you to be within{' '}
              <TextCustom size="s" type="bold">
                {formatRadius(eventData?.geofence?.radiusMeters || 0)}
              </TextCustom>{' '}
              of{' '}
              <TextCustom size="s" type="bold">
                {eventData?.geofence?.locationName || 'the event location'}
              </TextCustom>
              .
            </TextCustom>
            {geofenceCheck.formattedDistance && (
              <>
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  You are currently{' '}
                  <TextCustom
                    size="s"
                    type="bold"
                    color={
                      geofenceCheck.canAccess
                        ? themeColors[theme]['intent-success']
                        : themeColors[theme]['intent-error']
                    }
                  >
                    {geofenceCheck.formattedDistance}
                  </TextCustom>{' '}
                  away.
                </TextCustom>
                {!geofenceCheck.canAccess && geofenceCheck.distance && (
                  <View
                    className="mt-2 rounded-md p-2"
                    style={{
                      backgroundColor:
                        theme === 'dark'
                          ? 'rgba(255, 0, 0, 0.1)'
                          : 'rgba(255, 0, 0, 0.05)'
                    }}
                  >
                    <TextCustom
                      size="xs"
                      color={themeColors[theme]['intent-error']}
                      type="bold"
                    >
                      ❌ Distance Check: {geofenceCheck.formattedDistance} &gt;{' '}
                      {formatRadius(eventData?.geofence?.radiusMeters || 0)}
                    </TextCustom>
                    <TextCustom
                      size="xs"
                      color={themeColors[theme]['text-secondary']}
                      className="mt-1"
                    >
                      You need to be closer to the event location.
                    </TextCustom>
                  </View>
                )}
              </>
            )}
          </View>

          <LocationPicker
            value={temporaryLocation}
            onChange={handleLocationChange}
            placeholder="Set your location"
            allowCurrentLocation={true}
          />

          <RippleButton
            title="Save Location & Accept"
            onPress={handleSaveLocation}
            disabled={!temporaryLocation?.coords}
            width="full"
          />
        </View>
      </SwipeModal>

    <Animated.View style={animatedStyle}>
      <View className="gap-2 rounded-md border border-border bg-bg-secondary px-4 py-3">
        <View className="flex-row items-center">
          <MaterialCommunityIcons
            name="party-popper"
            size={18}
            color={themeColors[theme]['primary']}
            style={{ marginRight: 8 }}
          />
          <TextCustom
            type="semibold"
            size="m"
            color={themeColors[theme]['text-main']}
          >
            Event Invitation
          </TextCustom>
        </View>

        <View>
          <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
            {`You've been invited to join ${invitation.eventName ? `"${invitation.eventName}"` : 'an'} event.`}
          </TextCustom>
        </View>

        {eventEnded && (
          <TextCustom size="s" color={themeColors[theme]['intent-error']}>
            This event has already ended.
          </TextCustom>
        )}

        {hasGeofence && !eventEnded && (
          <View>
            <TextCustom size="s" color={themeColors[theme]['intent-warning']}>
              ⚠️ This event requires you to be within{' '}
                {formatRadius(eventData.geofence.radiusMeters)} of{' '}
              {eventData.geofence.locationName || 'the event location'}.
            </TextCustom>
              {geofenceCheck.formattedDistance && (
                <TextCustom
                  size="s"
                  color={themeColors[theme]['text-secondary']}
                >
                  Your distance:{' '}
                  <TextCustom
                    size="s"
                    type="bold"
                    color={
                      geofenceCheck.canAccess
                        ? themeColors[theme]['intent-success']
                        : themeColors[theme]['intent-error']
                    }
                  >
                    {geofenceCheck.formattedDistance}
                  </TextCustom>
                </TextCustom>
              )}
            {!hasUserLocation && (
              <TextCustom
                type="link"
                size="s"
                  onPress={() => setShowLocationModal(true)}
              >
                  Set your location to participate →
                </TextCustom>
              )}
              {hasUserLocation && !geofenceCheck.canAccess && (
                <TextCustom
                  type="link"
                  size="s"
                  onPress={() => setShowLocationModal(true)}
                >
                  Update your location to participate →
              </TextCustom>
            )}
          </View>
        )}

        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <RippleButton
              title={eventEnded ? 'Delete' : 'Accept'}
              size="sm"
              loading={processingEventInvitations.has(invitation.id)}
                disabled={processingEventInvitations.has(invitation.id)}
                onPress={handleAcceptInvitation}
              width="full"
            />
          </View>
          {!eventEnded && (
            <View className="flex-1">
              <RippleButton
                title="Decline"
                size="sm"
                variant="outline"
                loading={processingEventInvitations.has(invitation.id)}
                disabled={processingEventInvitations.has(invitation.id)}
                onPress={() => onDecline(invitation)}
                width="full"
              />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
    </>
  );
};

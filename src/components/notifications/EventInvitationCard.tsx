import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';

import { Logger } from '@/components/modules/logger';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import {
  EventInvitation,
  EventService
} from '@/utils/firebase/firebase-service-events';

interface EventInvitationCardProps {
  invitation: EventInvitation;
  profile: any;
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
  const hasUserLocation = profile?.privateInfo?.location?.coords != null;
  const eventEnded = eventData ? EventService.hasEventEnded(eventData) : false;
  const canAccept = !eventEnded && (!hasGeofence || hasUserLocation);

  return (
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
              {eventData.geofence.radiusMeters}m of{' '}
              {eventData.geofence.locationName || 'the event location'}.
            </TextCustom>
            {!hasUserLocation && (
              <TextCustom
                type="link"
                size="s"
                onPress={() => router.push('/(tabs)/profile/edit-profile')}
              >
                Add your location to your profile to participate →
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
              disabled={
                processingEventInvitations.has(invitation.id) || !canAccept
              }
              onPress={() => {
                if (eventEnded) {
                  onDecline(invitation);
                } else {
                  onAccept(invitation);
                }
              }}
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
  );
};

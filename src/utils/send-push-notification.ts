/**
 * Client-side function to send push notifications via Expo Push API
 * This is used for sending notifications when user performs an action
 */

import { Platform } from 'react-native';

import { Logger } from '@/modules/logger';

interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: 'default' | null;
}

/**
 * Send a push notification via Expo Push Notification Service
 */
export async function sendPushNotification(
  payload: NotificationPayload
): Promise<void> {
  if (Platform.OS === 'web') {
    Logger.warn(
      'Push notifications are not supported on web yet',
      null,
      '🔔 sendPushNotification function'
    );
    return;
  }

  const message = {
    to: payload.to,
    sound: payload.sound || 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    badge: payload.badge
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    const result = await response.json();

    if (result.data?.status === 'error') {
      console.error('Error sending push notification:', result.data.message);
      throw new Error(result.data.message);
    }

    Logger.info(
      'Push notification sent successfully:',
      result,
      '🔔 sendPushNotification function'
    );
  } catch (error) {
    Logger.error(
      'Failed to send push notification:',
      error,
      '🔔 sendPushNotification function'
    );
    throw error;
  }
}

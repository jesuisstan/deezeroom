import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';

import { Logger } from '@/modules/logger';
import { auth, db } from '@/utils/firebase/firebase-init';
import { sendPushNotification } from '@/utils/send-push-notification';

export interface PlaylistInvitation {
  id: string;
  playlistId: string;
  inviterId: string;
  inviteeId: string;
  inviteeEmail?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt?: Date;
  inviterName?: string;
  playlistName?: string;
}

/**
 * Invite a user to a playlist
 * Sends push notification automatically
 */
export async function inviteUserToPlaylist(
  playlistId: string,
  inviteeEmail: string,
  inviteeUserId?: string
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get playlist data
    const playlistRef = doc(db, 'playlists', playlistId);
    const playlistDoc = await getDoc(playlistRef);

    if (!playlistDoc.exists()) {
      throw new Error('Playlist not found');
    }

    const playlistData = playlistDoc.data();
    const playlistName = playlistData.name;

    // Create invitation
    const invitationsRef = collection(
      db,
      'playlists',
      playlistId,
      'invitations'
    );
    const invitationData = {
      inviterId: user.uid,
      inviteeId: inviteeUserId || null,
      inviteeEmail,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const invitationRef = await addDoc(invitationsRef, invitationData);
    Logger.info('Invitation created:', invitationRef.id);

    // If invitee has a userId, try to send push notification
    if (inviteeUserId) {
      try {
        // Get invitee user data
        const inviteeRef = doc(db, 'users', inviteeUserId);
        const inviteeDoc = await getDoc(inviteeRef);

        if (inviteeDoc.exists()) {
          const inviteeData = inviteeDoc.data();
          const pushToken = inviteeData?.pushTokens;

          if (pushToken?.expoPushToken) {
            // Get inviter name
            const inviterRef = doc(db, 'users', user.uid);
            const inviterDoc = await getDoc(inviterRef);
            const inviterData = inviterDoc.data();
            const inviterName =
              inviterData?.displayName ||
              inviterData?.email?.split('@')[0] ||
              'Someone';

            // Send push notification
            await sendPushNotification({
              to: pushToken.expoPushToken,
              title: 'New Playlist Invitation',
              body: `${inviterName} invited you to collaborate on "${playlistName}"`,
              data: {
                type: 'invitation',
                playlistId,
                invitationId: invitationRef.id
              },
              badge: 1
            });

            Logger.info('Push notification sent to invitee');
          }
        }
      } catch (error) {
        Logger.error('Error sending push notification:', error);
        // Don't throw - invitation is created, notification is optional
      }
    }
  } catch (error) {
    Logger.error('Error inviting user to playlist:', error);
    throw error;
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  playlistId: string,
  invitationId: string
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const invitationRef = doc(
      db,
      'playlists',
      playlistId,
      'invitations',
      invitationId
    );
    await updateDoc(invitationRef, {
      status: 'accepted',
      updatedAt: new Date()
    });

    Logger.info('Invitation accepted');
  } catch (error) {
    Logger.error('Error accepting invitation:', error);
    throw error;
  }
}

/**
 * Decline an invitation
 */
export async function declineInvitation(
  playlistId: string,
  invitationId: string
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const invitationRef = doc(
      db,
      'playlists',
      playlistId,
      'invitations',
      invitationId
    );
    await updateDoc(invitationRef, {
      status: 'declined',
      updatedAt: new Date()
    });

    Logger.info('Invitation declined');
  } catch (error) {
    Logger.error('Error declining invitation:', error);
    throw error;
  }
}

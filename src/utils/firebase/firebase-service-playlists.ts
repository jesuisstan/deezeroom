import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

import { Logger } from '@/modules/logger';
import { db } from '@/utils/firebase/firebase-init';
import { sendPushNotification } from '@/utils/send-push-notification';

import { parseFirestoreDate } from './firestore-date-utils';

export interface PlaylistParticipant {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

export interface PlaylistInvitation {
  id: string;
  playlistId: string;
  playlistName?: string;
  userId: string;
  invitedBy: string;
  invitedAt: Date | any; // Can be Date or Firestore Timestamp
  status: 'pending' | 'accepted' | 'declined';
  displayName?: string;
  email?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;

  // Visibility management
  visibility: 'public' | 'private';

  // License management
  editPermissions: 'everyone' | 'invited';

  // Participants
  participants: PlaylistParticipant[];

  // Real-time sync
  lastModifiedBy: string;
  version: number;

  // Metadata
  trackCount: number;
  totalDuration: number; // in seconds

  // Ordered list of Deezer track IDs (we store only IDs, not full data)
  tracks?: string[];

  // Cover image
  coverImageUrl?: string;
}

export class PlaylistService {
  private static collection = 'playlists';
  private static tracksCollection = 'tracks';
  private static invitationsCollection = 'invitations';

  // ===== PLAYLIST MANAGEMENT =====

  static async createPlaylist(
    data: Omit<
      Playlist,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'version'
      | 'trackCount'
      | 'totalDuration'
      | 'lastModifiedBy'
    >,
    createdBy: string,
    ownerData?: { displayName?: string; email?: string; photoURL?: string }
  ): Promise<string> {
    const playlistData = {
      ...data,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastModifiedBy: createdBy,
      version: 1,
      trackCount: 0,
      totalDuration: 0,
      tracks: [],
      participants: [
        {
          userId: createdBy,
          role: 'owner' as const,
          joinedAt: new Date(),
          ...(ownerData?.displayName && { displayName: ownerData.displayName }),
          ...(ownerData?.email && { email: ownerData.email }),
          ...(ownerData?.photoURL && { photoURL: ownerData.photoURL })
        }
      ]
    };

    const docRef = await addDoc(collection(db, this.collection), playlistData);
    return docRef.id;
  }

  static async getPlaylist(id: string): Promise<Playlist | null> {
    const playlistRef = doc(db, this.collection, id);
    const playlistSnap = await getDoc(playlistRef);

    if (playlistSnap.exists()) {
      return { id: playlistSnap.id, ...playlistSnap.data() } as Playlist;
    }
    return null;
  }

  static async updatePlaylist(
    playlistId: string,
    updates: Partial<Omit<Playlist, 'id' | 'createdAt' | 'version'>>
  ): Promise<void> {
    const playlistRef = doc(db, this.collection, playlistId);

    await updateDoc(playlistRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      version: increment(1)
    });
  }

  static async updatePlaylistCover(
    playlistId: string,
    coverImageUrl: string
  ): Promise<void> {
    await this.updatePlaylist(playlistId, { coverImageUrl });
  }

  static async deletePlaylist(playlistId: string): Promise<void> {
    // Get playlist data first to check for cover image
    const playlist = await this.getPlaylist(playlistId);

    // Delete playlist tracks
    const tracksQuery = query(
      collection(db, this.collection, playlistId, this.tracksCollection)
    );
    const tracksSnapshot = await getDocs(tracksQuery);

    const batch = writeBatch(db);

    // Delete all tracks
    tracksSnapshot.docs.forEach((trackDoc) => {
      batch.delete(trackDoc.ref);
    });

    // Delete playlist
    batch.delete(doc(db, this.collection, playlistId));

    await batch.commit();

    // Delete cover image from Storage if it exists
    if (playlist?.coverImageUrl) {
      try {
        const { StorageService } = await import('./firebase-service-storage');
        await StorageService.deleteImage(playlist.coverImageUrl);
      } catch (error) {
        console.warn('Failed to delete playlist cover image:', error);
        // Don't fail the entire operation if image deletion fails
      }
    }
  }

  // ===== USER PLAYLISTS =====

  static async getUserPlaylists(userId: string): Promise<Playlist[]> {
    // Get all playlists and filter by owner in memory
    // This is more reliable than array-contains with complex objects
    const q = query(
      collection(db, this.collection),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const allPlaylists = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Playlist
    );

    // Filter playlists where user is the creator
    return allPlaylists.filter((playlist) => playlist.createdBy === userId);
  }

  static async getUserParticipatingPlaylists(
    userId: string
  ): Promise<Playlist[]> {
    // Get all playlists and filter by participants in memory
    // This is more reliable than array-contains with complex objects
    const q = query(
      collection(db, this.collection),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const allPlaylists = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Playlist
    );

    // Filter playlists where user is participant but not owner
    return allPlaylists.filter(
      (playlist) =>
        playlist.participants.some((p) => p.userId === userId) &&
        playlist.createdBy !== userId
    );
  }

  static async getPublicPlaylists(
    limitCount: number = 20
  ): Promise<Playlist[]> {
    const q = query(
      collection(db, this.collection),
      where('visibility', '==', 'public'),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Playlist
    );
  }

  // ===== TRACK MANAGEMENT =====

  static async addTrackToPlaylist(
    playlistId: string,
    trackId: string,
    durationSeconds: number,
    addedBy: string
  ): Promise<number> {
    // Check if user has permission to add tracks
    const canEdit = await this.canUserEditPlaylist(playlistId, addedBy);
    if (!canEdit) {
      throw new Error(
        'You do not have permission to add tracks to this playlist'
      );
    }

    return await runTransaction(db, async (transaction) => {
      const playlistRef = doc(db, this.collection, playlistId);
      const playlistDoc = await transaction.get(playlistRef);

      if (!playlistDoc.exists()) {
        throw new Error('Playlist not found');
      }

      const playlist = playlistDoc.data() as Playlist;
      const currentTracks = Array.isArray(playlist.tracks)
        ? [...(playlist.tracks as string[])]
        : [];

      // Check if track is already in playlist to prevent duplicates
      if (currentTracks.includes(trackId)) {
        throw new Error('Track is already in this playlist');
      }

      currentTracks.unshift(trackId);
      const newPosition = 1; // 1-based position at start

      // Update playlist metadata and tracks array
      transaction.update(playlistRef, {
        tracks: currentTracks,
        trackCount: increment(1),
        totalDuration: increment(durationSeconds),
        updatedAt: serverTimestamp(),
        lastModifiedBy: addedBy,
        version: increment(1)
      });

      return newPosition;
    });
  }

  static async removeTrackFromPlaylist(
    playlistId: string,
    trackId: string,
    userId: string,
    durationSeconds?: number
  ): Promise<void> {
    // Check if user has permission to remove tracks
    const canEdit = await this.canUserEditPlaylist(playlistId, userId);
    if (!canEdit) {
      throw new Error(
        'You do not have permission to remove tracks from this playlist'
      );
    }

    await runTransaction(db, async (transaction) => {
      const playlistRef = doc(db, this.collection, playlistId);
      const playlistDoc = await transaction.get(playlistRef);

      if (!playlistDoc.exists()) {
        throw new Error('Playlist not found');
      }

      const playlist = playlistDoc.data() as Playlist;
      const currentTracks = Array.isArray(playlist.tracks)
        ? [...(playlist.tracks as string[])]
        : [];

      const indexToRemove = currentTracks.indexOf(trackId);
      if (indexToRemove === -1) {
        throw new Error('Track not found in playlist');
      }
      currentTracks.splice(indexToRemove, 1); // remove first occurrence only

      transaction.update(playlistRef, {
        tracks: currentTracks,
        trackCount: increment(-1),
        totalDuration: durationSeconds
          ? increment(-durationSeconds)
          : increment(0),
        updatedAt: serverTimestamp(),
        version: increment(1)
      });
    });
  }

  static async reorderTrack(
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const playlistRef = doc(db, this.collection, playlistId);
      const playlistDoc = await transaction.get(playlistRef);

      if (!playlistDoc.exists()) {
        throw new Error('Playlist not found');
      }

      const playlist = playlistDoc.data() as Playlist;
      const currentTracks = Array.isArray(playlist.tracks)
        ? [...(playlist.tracks as string[])]
        : [];

      if (
        fromIndex < 0 ||
        fromIndex >= currentTracks.length ||
        toIndex < 0 ||
        toIndex >= currentTracks.length
      ) {
        throw new Error('Invalid reorder indexes');
      }

      const [moved] = currentTracks.splice(fromIndex, 1);
      currentTracks.splice(toIndex, 0, moved);

      transaction.update(playlistRef, {
        tracks: currentTracks,
        updatedAt: serverTimestamp(),
        version: increment(1)
      });
    });
  }

  // ===== PARTICIPANTS MANAGEMENT =====

  static async inviteUserToPlaylist(
    playlistId: string,
    userId: string,
    invitedBy: string,
    displayName?: string,
    email?: string
  ): Promise<string> {
    // Check if user has permission to invite
    const canInvite = await this.canUserInviteToPlaylist(playlistId, invitedBy);
    if (!canInvite) {
      throw new Error(
        'You do not have permission to invite users to this playlist'
      );
    }

    // Get playlist name for the invitation
    const playlist = await this.getPlaylist(playlistId);
    const playlistName = playlist?.name;

    const invitationData = {
      userId,
      invitedBy,
      invitedAt: new Date(),
      status: 'pending' as const,
      displayName,
      email,
      playlistName
    };

    const docRef = await addDoc(
      collection(db, this.collection, playlistId, this.invitationsCollection),
      invitationData
    );

    // Send push notification to invited user
    try {
      // Get invited user's push token
      const inviteeRef = doc(db, 'users', userId);
      const inviteeDoc = await getDoc(inviteeRef);

      if (inviteeDoc.exists()) {
        const inviteeData = inviteeDoc.data();
        const pushToken = inviteeData?.pushTokens;

        if (pushToken?.expoPushToken) {
          // Get inviter name
          const inviterRef = doc(db, 'users', invitedBy);
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
            body: `${inviterName} invited you to collaborate on "${playlistName || 'a playlist'}"`,
            data: {
              type: 'invitation',
              playlistId,
              invitationId: docRef.id
            },
            badge: 1
          });

          Logger.info('Push notification sent to invited user');
        }
      }
    } catch (error) {
      Logger.error('Error sending push notification:', error);
      // Don't throw - invitation is created, notification is optional
    }

    return docRef.id;
  }

  // Invite multiple users to playlist
  static async inviteMultipleUsersToPlaylist(
    playlistId: string,
    users: { userId: string; displayName?: string; email?: string }[],
    invitedBy: string
  ): Promise<{ success: boolean; invitedCount: number; errors: string[] }> {
    try {
      const errors: string[] = [];
      let invitedCount = 0;

      // Check if playlist exists and user has permission to invite
      const playlist = await this.getPlaylist(playlistId);
      if (!playlist) {
        return {
          success: false,
          invitedCount: 0,
          errors: ['Playlist not found']
        };
      }

      // Check if user can invite (owner or has edit permissions)
      const canInvite =
        playlist.createdBy === invitedBy ||
        playlist.participants.some(
          (p) => p.userId === invitedBy && p.role === 'editor'
        );

      if (!canInvite) {
        return {
          success: false,
          invitedCount: 0,
          errors: ['You do not have permission to invite users']
        };
      }

      // Process invitations
      for (const user of users) {
        try {
          // Check if user is already a participant
          const isAlreadyParticipant = playlist.participants.some(
            (p) => p.userId === user.userId
          );
          if (isAlreadyParticipant) {
            errors.push(
              `${user.displayName || user.email || 'User'} is already a participant`
            );
            continue;
          }

          // Check if invitation already exists
          const existingInvitationsQuery = query(
            collection(
              db,
              this.collection,
              playlistId,
              this.invitationsCollection
            ),
            where('userId', '==', user.userId),
            where('status', '==', 'pending')
          );
          const existingInvitations = await getDocs(existingInvitationsQuery);

          if (!existingInvitations.empty) {
            errors.push(
              `${user.displayName || user.email || 'User'} already has a pending invitation`
            );
            continue;
          }

          // Create invitation
          await this.inviteUserToPlaylist(
            playlistId,
            user.userId,
            invitedBy,
            user.displayName,
            user.email
          );

          invitedCount++;
        } catch (error) {
          Logger.error(`Error inviting user ${user.userId}:`, error);
          errors.push(
            `Failed to invite ${user.displayName || user.email || 'User'}`
          );
        }
      }

      return { success: true, invitedCount, errors };
    } catch (error) {
      Logger.error('Error inviting multiple users:', error);
      return {
        success: false,
        invitedCount: 0,
        errors: ['Failed to process invitations']
      };
    }
  }

  static async removeParticipant(
    playlistId: string,
    userId: string
  ): Promise<void> {
    const playlistRef = doc(db, this.collection, playlistId);
    const playlistDoc = await getDoc(playlistRef);

    if (!playlistDoc.exists()) return;

    const playlist = playlistDoc.data() as Playlist;
    const updatedParticipants = playlist.participants.filter(
      (p) => p.userId !== userId
    );

    await updateDoc(playlistRef, {
      participants: updatedParticipants,
      updatedAt: serverTimestamp(),
      version: increment(1)
    });
  }

  // ===== USER INVITATIONS =====

  // Get all invitations for a specific user
  static async getUserInvitations(
    userId: string
  ): Promise<PlaylistInvitation[]> {
    try {
      // Get all playlists to find invitations for this user
      const playlistsQuery = query(collection(db, this.collection));
      const playlistsSnapshot = await getDocs(playlistsQuery);

      const allInvitations: PlaylistInvitation[] = [];

      for (const playlistDoc of playlistsSnapshot.docs) {
        const playlistId = playlistDoc.id;

        // Get invitations for this playlist (only by userId, no orderBy to avoid index requirement)
        const invitationsQuery = query(
          collection(
            db,
            this.collection,
            playlistId,
            this.invitationsCollection
          ),
          where('userId', '==', userId),
          where('status', '==', 'pending')
        );

        const invitationsSnapshot = await getDocs(invitationsQuery);

        invitationsSnapshot.docs.forEach((invitationDoc) => {
          allInvitations.push({
            id: invitationDoc.id,
            playlistId,
            ...invitationDoc.data()
          } as PlaylistInvitation);
        });
      }

      // Sort by invitedAt in memory (descending)
      return allInvitations.sort((a, b) => {
        const dateA = parseFirestoreDate(a.invitedAt);
        const dateB = parseFirestoreDate(b.invitedAt);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      Logger.error('Error getting user invitations:', error);
      return [];
    }
  }

  // Get all sent invitations that received responses (accepted or declined)
  // Returns only recent responses (within last 7 days) for badge count
  static async getUserSentInvitationsResponses(
    userId: string,
    sinceDaysAgo: number = 7
  ): Promise<PlaylistInvitation[]> {
    try {
      // Get all playlists to find sent invitations
      const playlistsQuery = query(collection(db, this.collection));
      const playlistsSnapshot = await getDocs(playlistsQuery);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - sinceDaysAgo);

      const allResponses: PlaylistInvitation[] = [];

      for (const playlistDoc of playlistsSnapshot.docs) {
        const playlistId = playlistDoc.id;

        // Get invitations where user is the inviter and status is accepted or declined
        const invitationsQuery = query(
          collection(
            db,
            this.collection,
            playlistId,
            this.invitationsCollection
          ),
          where('invitedBy', '==', userId)
        );

        const invitationsSnapshot = await getDocs(invitationsQuery);

        invitationsSnapshot.docs.forEach((invitationDoc) => {
          const invitation = {
            id: invitationDoc.id,
            playlistId,
            ...invitationDoc.data()
          } as PlaylistInvitation;

          // Only include accepted or declined invitations from recent period
          if (
            (invitation.status === 'accepted' ||
              invitation.status === 'declined') &&
            invitation.invitedAt
          ) {
            const invitedAt = parseFirestoreDate(invitation.invitedAt);
            if (invitedAt >= cutoffDate) {
              allResponses.push(invitation);
            }
          }
        });
      }

      // Sort by invitedAt in memory (descending) - most recent first
      return allResponses.sort((a, b) => {
        const dateA = parseFirestoreDate(a.invitedAt);
        const dateB = parseFirestoreDate(b.invitedAt);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      Logger.error('Error getting sent invitations responses:', error);
      return [];
    }
  }

  // Accept an invitation
  static async acceptInvitation(
    playlistId: string,
    invitationId: string,
    userId: string,
    role: 'editor' | 'viewer' = 'editor',
    userData?: { displayName?: string; email?: string; photoURL?: string }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // First, validate the invitation outside of transaction
      const invitationRef = doc(
        db,
        this.collection,
        playlistId,
        this.invitationsCollection,
        invitationId
      );

      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        return { success: false, message: 'Invitation not found' };
      }

      const invitation = invitationDoc.data() as PlaylistInvitation;

      // Verify this invitation is for the current user
      if (invitation.userId !== userId) {
        return { success: false, message: 'This invitation is not for you' };
      }

      // Check if invitation is still pending
      if (invitation.status !== 'pending') {
        return {
          success: false,
          message: 'This invitation has already been processed'
        };
      }

      // Validate playlist exists and user permissions
      const playlist = await this.getPlaylist(playlistId);
      if (!playlist) {
        return { success: false, message: 'Playlist not found' };
      }

      // Check if user is already a participant
      const isAlreadyParticipant = playlist.participants.some(
        (p) => p.userId === userId
      );

      if (isAlreadyParticipant) {
        return {
          success: false,
          message: 'You are already a participant in this playlist'
        };
      }

      // Now execute the transaction
      await runTransaction(db, async (transaction) => {
        const playlistRef = doc(db, this.collection, playlistId);

        // Update invitation status
        transaction.update(invitationRef, {
          status: 'accepted'
        });

        // Add user to participants with additional info from invitation and user data
        const participantData: PlaylistParticipant = {
          userId,
          role,
          joinedAt: new Date(),
          displayName: userData?.displayName || invitation.displayName,
          email: userData?.email || invitation.email
        };

        // Only add photoURL if it exists
        if (userData?.photoURL) {
          participantData.photoURL = userData.photoURL;
        }

        const updatedParticipants = [...playlist.participants, participantData];

        transaction.update(playlistRef, {
          participants: updatedParticipants,
          updatedAt: serverTimestamp(),
          version: increment(1)
        });
      });

      // Send push notification to inviter
      try {
        const inviterRef = doc(db, 'users', invitation.invitedBy);
        const inviterDoc = await getDoc(inviterRef);

        if (inviterDoc.exists()) {
          const inviterData = inviterDoc.data();
          const pushToken = inviterData?.pushTokens;

          if (pushToken?.expoPushToken) {
            const accepterName =
              invitation.displayName ||
              invitation.email?.split('@')[0] ||
              'Someone';

            await sendPushNotification({
              to: pushToken.expoPushToken,
              title: 'Invitation Accepted',
              body: `${accepterName} accepted your invitation to "${playlist?.name || 'playlist'}"`,
              data: {
                type: 'invitation_accepted',
                playlistId,
                userId
              },
              badge: 1
            });

            Logger.info('Push notification sent to inviter');
          }
        }
      } catch (error) {
        Logger.error('Error sending push notification to inviter:', error);
        // Don't throw - invitation is accepted, notification is optional
      }

      return { success: true, message: 'Invitation accepted successfully' };
    } catch (error) {
      Logger.error('Error accepting invitation:', error);

      // Handle specific Firestore errors
      if (error && typeof error === 'object' && 'code' in error) {
        if ((error as any).code === 'permission-denied') {
          return {
            success: false,
            message:
              'Permission denied. Please make sure the invitation is valid and try again.'
          };
        } else if ((error as any).code === 'not-found') {
          return {
            success: false,
            message: 'Invitation or playlist not found.'
          };
        }
      }

      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to accept invitation'
      };
    }
  }

  // Decline an invitation
  static async declineInvitation(
    playlistId: string,
    invitationId: string,
    userId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const invitationRef = doc(
        db,
        this.collection,
        playlistId,
        this.invitationsCollection,
        invitationId
      );

      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        return { success: false, message: 'Invitation not found' };
      }

      const invitation = invitationDoc.data() as PlaylistInvitation;

      // Verify this invitation is for the current user
      if (invitation.userId !== userId) {
        return { success: false, message: 'This invitation is not for you' };
      }

      // Check if invitation is still pending
      if (invitation.status !== 'pending') {
        return {
          success: false,
          message: 'This invitation has already been processed'
        };
      }

      // Update invitation status
      await updateDoc(invitationRef, {
        status: 'declined'
      });

      // Send push notification to inviter
      try {
        const playlist = await this.getPlaylist(playlistId);
        const inviterRef = doc(db, 'users', invitation.invitedBy);
        const inviterDoc = await getDoc(inviterRef);

        if (inviterDoc.exists()) {
          const inviterData = inviterDoc.data();
          const pushToken = inviterData?.pushTokens;

          if (pushToken?.expoPushToken) {
            const declinerName =
              invitation.displayName ||
              invitation.email?.split('@')[0] ||
              'Someone';

            await sendPushNotification({
              to: pushToken.expoPushToken,
              title: 'Invitation Declined',
              body: `${declinerName} declined your invitation to "${playlist?.name || 'playlist'}"`,
              data: {
                type: 'invitation_declined',
                playlistId,
                userId
              },
              badge: 1
            });

            Logger.info('Push notification sent to inviter');
          }
        }
      } catch (error) {
        Logger.error('Error sending push notification to inviter:', error);
        // Don't throw - invitation is declined, notification is optional
      }

      return { success: true, message: 'Invitation declined' };
    } catch (error) {
      Logger.error('Error declining invitation:', error);

      // Handle specific Firestore errors
      if (error && typeof error === 'object' && 'code' in error) {
        if ((error as any).code === 'permission-denied') {
          return {
            success: false,
            message: 'Permission denied. Unable to decline invitation.'
          };
        }
      }

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to decline invitation'
      };
    }
  }

  // ===== REAL-TIME SUBSCRIPTIONS =====

  static subscribeToPlaylist(
    playlistId: string,
    callback: (playlist: Playlist | null) => void
  ) {
    const playlistRef = doc(db, this.collection, playlistId);
    return onSnapshot(playlistRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as Playlist);
      } else {
        callback(null);
      }
    });
  }

  static subscribeToPlaylistTracks(
    playlistId: string,
    callback: (trackIds: string[]) => void
  ) {
    const playlistRef = doc(db, this.collection, playlistId);
    return onSnapshot(playlistRef, (docSnap) => {
      if (!docSnap.exists()) {
        callback([]);
        return;
      }
      const data = docSnap.data() as Playlist;
      const ids = (data.tracks as string[]) || [];
      callback(ids);
    });
  }

  static subscribeToPlaylistInvitations(
    playlistId: string,
    callback: (invitations: PlaylistInvitation[]) => void
  ) {
    const invitationsRef = collection(
      db,
      this.collection,
      playlistId,
      this.invitationsCollection
    );
    const q = query(invitationsRef, orderBy('invitedAt', 'desc'));

    return onSnapshot(q, (querySnapshot) => {
      const invitations = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        playlistId,
        ...doc.data()
      })) as PlaylistInvitation[];
      callback(invitations);
    });
  }

  // Subscribe to all user invitations across all playlists (Real-time)
  static subscribeToUserInvitations(
    userId: string,
    callback: (invitations: PlaylistInvitation[]) => void
  ): () => void {
    // We need to get all playlists and subscribe to their invitations
    // This is a more complex real-time subscription
    let unsubscribeFunctions: (() => void)[] = [];
    let allInvitations: PlaylistInvitation[] = [];

    const updateInvitations = () => {
      // Sort by invitedAt in memory (descending)
      const sortedInvitations = allInvitations.sort((a, b) => {
        const dateA = parseFirestoreDate(a.invitedAt);
        const dateB = parseFirestoreDate(b.invitedAt);
        return dateB.getTime() - dateA.getTime();
      });
      callback(sortedInvitations);
    };

    // First, get all playlists to set up individual subscriptions
    const setupSubscriptions = async () => {
      try {
        const playlistsQuery = query(collection(db, this.collection));
        const playlistsSnapshot = await getDocs(playlistsQuery);

        playlistsSnapshot.docs.forEach((playlistDoc) => {
          const playlistId = playlistDoc.id;

          // Subscribe to invitations for this playlist for the specific user
          const invitationsRef = collection(
            db,
            this.collection,
            playlistId,
            this.invitationsCollection
          );
          const invitationsQuery = query(
            invitationsRef,
            where('userId', '==', userId),
            where('status', '==', 'pending')
          );

          const unsubscribe = onSnapshot(
            invitationsQuery,
            (querySnapshot) => {
              // Remove old invitations for this playlist
              allInvitations = allInvitations.filter(
                (inv) => inv.playlistId !== playlistId
              );

              // Add new invitations for this playlist
              const newInvitations = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                playlistId,
                ...doc.data()
              })) as PlaylistInvitation[];

              allInvitations.push(...newInvitations);
              updateInvitations();
            },
            (error) => {
              Logger.error(
                `Error in real-time invitation subscription for playlist ${playlistId}:`,
                error
              );
            }
          );

          unsubscribeFunctions.push(unsubscribe);
        });
      } catch (error) {
        Logger.error(
          'Error setting up real-time invitation subscriptions:',
          error
        );
      }
    };

    setupSubscriptions();

    // Return cleanup function
    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
      unsubscribeFunctions = [];
      allInvitations = [];
    };
  }

  // Subscribe to user sent invitations responses (real-time)
  static subscribeToUserSentInvitationsResponses(
    userId: string,
    callback: (responses: PlaylistInvitation[]) => void,
    sinceDaysAgo: number = 7
  ): () => void {
    let unsubscribeFunctions: (() => void)[] = [];
    let allResponses: PlaylistInvitation[] = [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - sinceDaysAgo);

    const updateResponses = () => {
      const filteredResponses = allResponses.filter((response) => {
        if (
          (response.status === 'accepted' || response.status === 'declined') &&
          response.invitedAt
        ) {
          const invitedAt = parseFirestoreDate(response.invitedAt);
          return invitedAt >= cutoffDate;
        }
        return false;
      });

      const sortedResponses = filteredResponses.sort((a, b) => {
        const dateA = parseFirestoreDate(a.invitedAt);
        const dateB = parseFirestoreDate(b.invitedAt);
        return dateB.getTime() - dateA.getTime();
      });
      callback(sortedResponses);
    };

    const setupSubscriptions = async () => {
      try {
        const playlistsQuery = query(collection(db, this.collection));
        const playlistsSnapshot = await getDocs(playlistsQuery);

        for (const playlistDoc of playlistsSnapshot.docs) {
          const playlistId = playlistDoc.id;

          const invitationsQuery = query(
            collection(
              db,
              this.collection,
              playlistId,
              this.invitationsCollection
            ),
            where('invitedBy', '==', userId)
          );

          const unsubscribe = onSnapshot(invitationsQuery, (querySnapshot) => {
            allResponses = [];
            querySnapshot.docs.forEach((invitationDoc) => {
              const invitation = {
                id: invitationDoc.id,
                playlistId,
                ...invitationDoc.data()
              } as PlaylistInvitation;
              allResponses.push(invitation);
            });
            updateResponses();
          });

          unsubscribeFunctions.push(unsubscribe);
        }
      } catch (error) {
        Logger.error(
          'Error setting up sent invitations responses subscriptions:',
          error
        );
      }
    };

    setupSubscriptions();

    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
      unsubscribeFunctions = [];
      allResponses = [];
    };
  }

  // Update participant data (when user profile changes)
  static async updateParticipantData(
    playlistId: string,
    userId: string,
    userData: { displayName?: string; email?: string; photoURL?: string }
  ): Promise<void> {
    const playlistRef = doc(db, this.collection, playlistId);
    const playlistDoc = await getDoc(playlistRef);

    if (!playlistDoc.exists()) return;

    const playlist = playlistDoc.data() as Playlist;
    const updatedParticipants = playlist.participants.map((participant) =>
      participant.userId === userId
        ? {
            ...participant,
            ...(userData.displayName && { displayName: userData.displayName }),
            ...(userData.email && { email: userData.email }),
            ...(userData.photoURL && { photoURL: userData.photoURL })
          }
        : participant
    );

    await updateDoc(playlistRef, {
      participants: updatedParticipants,
      updatedAt: serverTimestamp(),
      version: increment(1)
    });
  }

  // ===== PERMISSIONS CHECK =====

  static async canUserEditPlaylist(
    playlistId: string,
    userId: string
  ): Promise<boolean> {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) return false;

    // Owner can always edit
    if (playlist.createdBy === userId) return true;

    // Check if user is participant
    const participant = playlist.participants.find((p) => p.userId === userId);
    const isParticipant = !!participant;

    // PRIVATE playlists: only invited participants can edit
    if (playlist.visibility === 'private') {
      if (!isParticipant) return false;
      // Check if participant has editor or owner role
      return participant!.role === 'editor' || participant!.role === 'owner';
    }

    // PUBLIC playlists: depends on editPermissions
    if (playlist.visibility === 'public') {
      if (playlist.editPermissions === 'everyone') {
        // Everyone can edit (even non-participants)
        return true;
      } else if (playlist.editPermissions === 'invited') {
        // Only participants can edit
        if (!isParticipant) return false;
        return participant!.role === 'editor' || participant!.role === 'owner';
      }
    }

    return false;
  }

  static async canUserInviteToPlaylist(
    playlistId: string,
    userId: string
  ): Promise<boolean> {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) return false;

    // Owner can always invite
    if (playlist.createdBy === userId) return true;

    // Check if user is participant
    const participant = playlist.participants.find((p) => p.userId === userId);
    const isParticipant = !!participant;

    // PRIVATE playlists: only participants with editor/owner role can invite
    if (playlist.visibility === 'private') {
      if (!isParticipant) return false;
      return participant!.role === 'editor' || participant!.role === 'owner';
    }

    // PUBLIC playlists: depends on editPermissions
    if (playlist.visibility === 'public') {
      if (playlist.editPermissions === 'everyone') {
        // Everyone can invite in public playlists
        return true;
      } else if (playlist.editPermissions === 'invited') {
        // Only participants can invite
        if (!isParticipant) return false;
        return participant!.role === 'editor' || participant!.role === 'owner';
      }
    }

    return false;
  }

  static async canUserViewPlaylist(
    playlistId: string,
    userId: string
  ): Promise<boolean> {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) return false;

    // Public playlists can be viewed by everyone
    if (playlist.visibility === 'public') return true;

    // Private playlists only by participants
    const participant = playlist.participants.find((p) => p.userId === userId);
    return !!participant;
  }
}

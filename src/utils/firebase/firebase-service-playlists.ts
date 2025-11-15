import {
  addDoc,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  FirestoreError,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

import { Logger } from '@/components/modules/logger';
import { db } from '@/utils/firebase/firebase-init';
import { getUserPushTokens } from '@/utils/firebase/firebase-service-notifications';
import {
  getPublicProfileDoc,
  type PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';
import { sendPushNotification } from '@/utils/send-push-notification';

import { parseFirestoreDate } from './firestore-date-utils';

export interface PlaylistInvitation {
  id: string;
  playlistId: string;
  playlistName?: string;
  userId: string;
  invitedBy: string;
  invitedAt: Date | any; // Can be Date or Firestore Timestamp
  status: 'pending';
}

export interface OwnershipTransferNotification {
  id: string;
  playlistId: string;
  playlistName: string;
  previousOwnerId: string;
  receivedAt: Date;
}

const FALLBACK_DISPLAY_NAME = 'Someone';

const resolveDisplayName = (
  publicProfile: PublicProfileDoc | null,
  uid: string
) => publicProfile?.displayName || uid?.slice(0, 6) || FALLBACK_DISPLAY_NAME;

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;

  // Visibility management
  visibility: 'public' | 'private';

  // License management
  editPermissions: 'everyone' | 'invited';

  // Participants - all participants can edit
  participantIds: string[];
  pendingInviteIds?: string[];

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

export type PlaylistTrackPosition =
  | { placement: 'start' }
  | { placement: 'end' }
  | { placement: 'after'; referenceId: string };

export class PlaylistService {
  private static collection = 'playlists';
  private static tracksCollection = 'tracks';
  private static invitationsCollection = 'playlistInvitations';

  private static uniqueStringArray(
    values: (string | undefined | null)[]
  ): string[] {
    const set = new Set<string>();
    values.forEach((value) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        set.add(value);
      }
    });
    return Array.from(set);
  }

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
      | 'ownerId'
      | 'participantIds'
    >,
    ownerId: string
  ): Promise<string> {
    const playlistData = {
      ...data,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastModifiedBy: ownerId,
      version: 1,
      trackCount: 0,
      totalDuration: 0,
      tracks: [],
      participantIds: [ownerId],
      pendingInviteIds: []
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

    // Remove undefined values (Firestore doesn't support undefined)
    const cleanUpdates = Object.entries(updates).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>
    );

    await updateDoc(playlistRef, {
      ...cleanUpdates,
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

    // Delete invitations
    const invitationsQuery = query(
      collection(db, this.collection, playlistId, this.invitationsCollection)
    );
    const invitationsSnapshot = await getDocs(invitationsQuery);

    const batch = writeBatch(db);

    // Delete all tracks
    tracksSnapshot.docs.forEach((trackDoc) => {
      batch.delete(trackDoc.ref);
    });

    // Delete all invitations
    invitationsSnapshot.docs.forEach((invitationDoc) => {
      batch.delete(invitationDoc.ref);
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
    const q = query(
      collection(db, this.collection),
      where('ownerId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const playlists = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Playlist
    );

    return playlists.sort((a, b) => {
      const dateA = parseFirestoreDate(a.updatedAt);
      const dateB = parseFirestoreDate(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }

  static async getUserParticipatingPlaylists(
    userId: string
  ): Promise<Playlist[]> {
    const q = query(
      collection(db, this.collection),
      where('participantIds', 'array-contains', userId)
    );

    const querySnapshot = await getDocs(q);
    const playlists = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Playlist)
      .filter((playlist) => playlist.ownerId !== userId);

    return playlists.sort((a, b) => {
      const dateA = parseFirestoreDate(a.updatedAt);
      const dateB = parseFirestoreDate(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });
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
    trackId: string,
    targetPosition: PlaylistTrackPosition,
    userId: string
  ): Promise<void> {
    // Check if user has permission to reorder tracks
    const canEdit = await this.canUserEditPlaylist(playlistId, userId);
    if (!canEdit) {
      throw new Error(
        'You do not have permission to reorder tracks in this playlist'
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

      const fromIndex = currentTracks.findIndex((id) => id === trackId);
      if (fromIndex === -1) {
        throw new Error(`Track ${trackId} not found in playlist`);
      }

      const remainingTracks = currentTracks.filter((id) => id !== trackId);

      let insertionIndex = remainingTracks.length; // default to end

      switch (targetPosition.placement) {
        case 'start':
          insertionIndex = 0;
          break;
        case 'end':
          insertionIndex = remainingTracks.length;
          break;
        case 'after': {
          const referenceIndex = remainingTracks.findIndex(
            (id) => id === targetPosition.referenceId
          );

          if (referenceIndex === -1) {
            // Reference track might have been removed concurrently; place at end
            insertionIndex = remainingTracks.length;
          } else {
            insertionIndex = referenceIndex + 1;
          }
          break;
        }
        default:
          throw new Error('Invalid target position for track reorder');
      }

      const newOrder = [...remainingTracks];
      newOrder.splice(insertionIndex, 0, trackId);

      // If order remains unchanged, skip update
      if (
        currentTracks.length === newOrder.length &&
        currentTracks.every((id, idx) => id === newOrder[idx])
      ) {
        return;
      }

      transaction.update(playlistRef, {
        tracks: newOrder,
        updatedAt: serverTimestamp(),
        lastModifiedBy: userId,
        version: increment(1)
      });
    });
  }

  // ===== PARTICIPANTS MANAGEMENT =====

  static async inviteUserToPlaylist(
    playlistId: string,
    userId: string,
    invitedBy: string
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
      playlistName
    };

    const docRef = await addDoc(
      collection(db, this.collection, playlistId, this.invitationsCollection),
      invitationData
    );

    // Track pending invite on playlist document for permission checks
    try {
      const playlistRef = doc(db, this.collection, playlistId);
      await updateDoc(playlistRef, {
        pendingInviteIds: arrayUnion(userId)
      });
    } catch (error) {
      Logger.warn('Failed to update pendingInviteIds on invite', error);
    }

    // Send push notification to invited user
    try {
      const [inviteeTokens, inviterPublicProfile] = await Promise.all([
        getUserPushTokens(userId),
        getPublicProfileDoc(invitedBy)
      ]);

      const inviterName = resolveDisplayName(inviterPublicProfile, invitedBy);

      const uniqueTokens = new Set<string>();
      await Promise.allSettled(
        (inviteeTokens ?? [])
          .map((token) => token.expoPushToken)
          .filter((token): token is string => Boolean(token))
          .filter((token) => {
            if (uniqueTokens.has(token)) return false;
            uniqueTokens.add(token);
            return true;
          })
          .map((expoToken) =>
            sendPushNotification({
              to: expoToken,
              title: 'New Playlist Invitation',
              body: `${inviterName} invited you to collaborate on "${
                playlistName || 'a playlist'
              }"`,
              data: {
                type: 'invitation',
                playlistId,
                invitationId: docRef.id,
                toUid: userId
              },
              badge: 1
            })
          )
      );

      if (uniqueTokens.size > 0) {
        Logger.info('Push notification sent to invited user');
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
    users: { userId: string }[],
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

      // Check if user can invite (owner or participant)
      const canInvite =
        playlist.ownerId === invitedBy ||
        playlist.participantIds.includes(invitedBy);

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
          if (playlist.participantIds.includes(user.userId)) {
            errors.push(`${user.userId} - is already a participant`);
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
            errors.push(`${user.userId} - already has a pending invitation`);
            continue;
          }

          // Create invitation
          await this.inviteUserToPlaylist(playlistId, user.userId, invitedBy);

          invitedCount++;
        } catch (error) {
          Logger.error(`Error inviting user ${user.userId}:`, error);
          errors.push(`Failed to invite user ${user.userId}`);
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
    const updatedParticipantIds = this.uniqueStringArray(
      playlist.participantIds.filter((id) => id !== userId)
    );

    await updateDoc(playlistRef, {
      participantIds: updatedParticipantIds,
      updatedAt: serverTimestamp(),
      version: increment(1)
    });
  }

  // Leave playlist - if owner, transfer ownership or delete if only participant
  static async leavePlaylist(
    playlistId: string,
    userId: string
  ): Promise<{ success: boolean; deleted?: boolean; newOwnerId?: string }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const playlistRef = doc(db, this.collection, playlistId);
        const playlistDoc = await transaction.get(playlistRef);

        if (!playlistDoc.exists()) {
          throw new Error('Playlist not found');
        }

        const playlist = playlistDoc.data() as Playlist;

        if (!playlist.participantIds.includes(userId)) {
          throw new Error('User is not a participant of this playlist');
        }

        const isOwner = playlist.ownerId === userId;
        const otherParticipantIds = playlist.participantIds.filter(
          (id) => id !== userId
        );

        // If owner is leaving and they're the only participant, delete playlist
        if (isOwner && otherParticipantIds.length === 0) {
          transaction.delete(playlistRef);
          return { success: true, deleted: true };
        }

        // If owner is leaving and there are other participants, transfer ownership
        if (isOwner && otherParticipantIds.length > 0) {
          // Transfer to first participant
          const newOwnerId = otherParticipantIds[0];

          transaction.update(playlistRef, {
            ownerId: newOwnerId,
            participantIds: this.uniqueStringArray(otherParticipantIds),
            lastModifiedBy: newOwnerId,
            updatedAt: serverTimestamp(),
            version: increment(1)
          });

          // Send push notification to new owner
          try {
            const newOwnerTokens = await getUserPushTokens(newOwnerId);

            const leavingUserName = `The previous owner`;

            const uniqueTokens = new Set<string>();

            // Save ownership transfer notification to Firestore
            try {
              const ownershipTransferRef = doc(
                collection(db, 'users', newOwnerId, 'ownershipTransfers')
              );
              await setDoc(ownershipTransferRef, {
                playlistId,
                playlistName: playlist.name,
                previousOwnerId: userId,
                receivedAt: serverTimestamp()
              });
            } catch (error) {
              Logger.error(
                'Error saving ownership transfer notification:',
                error
              );
            }

            await Promise.allSettled(
              (newOwnerTokens ?? [])
                .map((token) => token.expoPushToken)
                .filter((token): token is string => Boolean(token))
                .filter((token) => {
                  if (uniqueTokens.has(token)) return false;
                  uniqueTokens.add(token);
                  return true;
                })
                .map((expoToken) =>
                  sendPushNotification({
                    to: expoToken,
                    title: 'Playlist updated',
                    body: `${leavingUserName} left "${playlist.name}" playlist and you are now the owner`,
                    data: {
                      type: 'playlist_ownership_transferred',
                      playlistId,
                      playlistName: playlist.name,
                      previousOwnerId: userId,
                      toUid: newOwnerId
                    },
                    badge: 1
                  })
                )
            );

            if (uniqueTokens.size > 0) {
              Logger.info('Push notification sent to new owner');
            }
          } catch (error) {
            Logger.error(
              'Error sending push notification to new owner:',
              error
            );
            // Don't throw - ownership is transferred, notification is optional
          }

          return {
            success: true,
            deleted: false,
            newOwnerId
          };
        }

        // If not owner, just remove participant
        transaction.update(playlistRef, {
          participantIds: this.uniqueStringArray(otherParticipantIds),
          lastModifiedBy: userId,
          updatedAt: serverTimestamp(),
          version: increment(1)
        });

        return { success: true, deleted: false };
      });
    } catch (error) {
      Logger.error('Error leaving playlist:', error);
      throw error;
    }
  }

  // ===== USER INVITATIONS =====

  // Get all invitations for a specific user
  static async getUserInvitations(
    userId: string
  ): Promise<PlaylistInvitation[]> {
    try {
      const invitationsQuery = query(
        collectionGroup(db, this.invitationsCollection),
        where('userId', '==', userId)
      );

      const invitationsSnapshot = await getDocs(invitationsQuery);

      const invitations = invitationsSnapshot.docs
        .map((invitationDoc) => {
          const parentPlaylistId = invitationDoc.ref.parent.parent?.id;
          return {
            id: invitationDoc.id,
            playlistId: parentPlaylistId || '',
            ...invitationDoc.data()
          } as PlaylistInvitation;
        })
        .filter((invitation) => invitation.status === 'pending');

      return invitations.sort((a, b) => {
        const dateA = parseFirestoreDate(a.invitedAt);
        const dateB = parseFirestoreDate(b.invitedAt);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      Logger.error('Error getting user invitations:', error);
      return [];
    }
  }

  // Accept an invitation
  static async acceptInvitation(
    playlistId: string,
    invitationId: string,
    userId: string
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
      // Now execute the transaction
      await runTransaction(db, async (transaction) => {
        const playlistRef = doc(db, this.collection, playlistId);
        const playlistSnapshot = await transaction.get(playlistRef);

        if (!playlistSnapshot.exists()) {
          throw new Error('Playlist not found');
        }

        const currentPlaylist = playlistSnapshot.data() as Playlist;

        if (currentPlaylist.participantIds.includes(userId)) {
          throw new Error('You are already a participant in this playlist');
        }

        const invitationSnapshot = await transaction.get(invitationRef);
        if (!invitationSnapshot.exists()) {
          throw new Error('Invitation not found');
        }

        const currentInvitation =
          invitationSnapshot.data() as PlaylistInvitation;
        if (currentInvitation.status !== 'pending') {
          throw new Error('This invitation has already been processed');
        }

        const updatedParticipantIds = this.uniqueStringArray([
          ...currentPlaylist.participantIds,
          userId
        ]);
        const updatedPendingInviteIds = Array.isArray(
          currentPlaylist.pendingInviteIds
        )
          ? currentPlaylist.pendingInviteIds.filter((id) => id !== userId)
          : [];

        transaction.delete(invitationRef);
        transaction.update(playlistRef, {
          participantIds: updatedParticipantIds,
          pendingInviteIds: updatedPendingInviteIds,
          updatedAt: serverTimestamp(),
          lastModifiedBy: userId,
          version: increment(1)
        });
      });

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

      // Remove invitation to keep collection clean
      await deleteDoc(invitationRef);

      // Remove pending invite reference from playlist document
      try {
        const playlistRef = doc(db, this.collection, playlistId);
        await runTransaction(db, async (transaction) => {
          const playlistSnapshot = await transaction.get(playlistRef);
          if (!playlistSnapshot.exists()) {
            return;
          }

          const playlist = playlistSnapshot.data() as Playlist;
          const updatedPendingInviteIds = Array.isArray(
            playlist.pendingInviteIds
          )
            ? playlist.pendingInviteIds.filter((id) => id !== userId)
            : [];

          transaction.update(playlistRef, {
            pendingInviteIds: updatedPendingInviteIds
          });
        });
      } catch (error) {
        Logger.warn('Failed to update pendingInviteIds on decline', error);
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
    callback: (playlist: Playlist | null, error?: unknown) => void
  ) {
    const playlistRef = doc(db, this.collection, playlistId);
    return onSnapshot(
      playlistRef,
      (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() } as Playlist);
        } else {
          callback(null);
        }
      },
      (error) => {
        const firestoreError = error as FirestoreError;
        if (firestoreError?.code === 'permission-denied') {
          Logger.warn('Playlist subscription permission denied', {
            playlistId
          });
        } else {
          Logger.error('Error in subscribeToPlaylist:', error);
        }
        callback(null, firestoreError);
      }
    );
  }

  static subscribeToPlaylistTracks(
    playlistId: string,
    callback: (trackIds: string[], error?: unknown) => void
  ) {
    const playlistRef = doc(db, this.collection, playlistId);
    return onSnapshot(
      playlistRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          callback([]);
          return;
        }
        const data = docSnap.data() as Playlist;
        const ids = (data.tracks as string[]) || [];
        callback(ids);
      },
      (error) => {
        const firestoreError = error as FirestoreError;
        if (firestoreError?.code === 'permission-denied') {
          Logger.warn('Playlist tracks subscription permission denied', {
            playlistId
          });
        } else {
          Logger.error('Error in subscribeToPlaylistTracks:', error);
        }
        callback([], firestoreError);
      }
    );
  }

  // Subscribe to user's own playlists (real-time, includes field updates)
  static subscribeToUserPlaylists(
    userId: string,
    callback: (playlists: Playlist[]) => void
  ): () => void {
    const q = query(
      collection(db, this.collection),
      where('ownerId', '==', userId)
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const userPlaylists = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Playlist
        );

        userPlaylists.sort((a, b) => {
          const dateA = parseFirestoreDate(a.updatedAt);
          const dateB = parseFirestoreDate(b.updatedAt);
          return dateB.getTime() - dateA.getTime();
        });

        callback(userPlaylists);
      },
      (error) => {
        Logger.error('Error in subscribeToUserPlaylists:', error);
      }
    );
  }

  // Subscribe to user's participating playlists (real-time, includes field updates)
  static subscribeToUserParticipatingPlaylists(
    userId: string,
    callback: (playlists: Playlist[]) => void
  ): () => void {
    const q = query(
      collection(db, this.collection),
      where('participantIds', 'array-contains', userId)
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const participatingPlaylists = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Playlist)
          .filter((playlist) => playlist.ownerId !== userId);

        participatingPlaylists.sort((a, b) => {
          const dateA = parseFirestoreDate(a.updatedAt);
          const dateB = parseFirestoreDate(b.updatedAt);
          return dateB.getTime() - dateA.getTime();
        });

        callback(participatingPlaylists);
      },
      (error) => {
        Logger.error('Error in subscribeToUserParticipatingPlaylists:', error);
      }
    );
  }

  // Subscribe to public playlists (real-time, includes field updates)
  static subscribeToPublicPlaylists(
    callback: (playlists: Playlist[]) => void,
    limitCount: number = 20
  ): () => void {
    const q = query(
      collection(db, this.collection),
      where('visibility', '==', 'public'),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const publicPlaylists = querySnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Playlist
        );

        // Always update to get field changes (name, description, etc.)
        callback(publicPlaylists);
      },
      (error) => {
        Logger.error('Error in subscribeToPublicPlaylists:', error);
      }
    );
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
    const invitationsQuery = query(
      collectionGroup(db, this.invitationsCollection),
      where('userId', '==', userId)
    );

    return onSnapshot(
      invitationsQuery,
      (querySnapshot) => {
        const invitations = querySnapshot.docs
          .map((invitationDoc) => {
            const parentPlaylistId = invitationDoc.ref.parent.parent?.id;
            return {
              id: invitationDoc.id,
              playlistId: parentPlaylistId || '',
              ...invitationDoc.data()
            } as PlaylistInvitation;
          })
          .filter((invitation) => invitation.status === 'pending');

        const sortedInvitations = invitations.sort((a, b) => {
          const dateA = parseFirestoreDate(a.invitedAt);
          const dateB = parseFirestoreDate(b.invitedAt);
          return dateB.getTime() - dateA.getTime();
        });

        callback(sortedInvitations);
      },
      (error) => {
        Logger.error('Error in real-time invitation subscriptions:', error);
      }
    );
  }

  // ===== OWNERSHIP TRANSFERS =====

  static subscribeToUserOwnershipTransfers(
    userId: string,
    callback: (transfers: OwnershipTransferNotification[]) => void
  ): () => void {
    const transfersQuery = query(
      collection(db, 'users', userId, 'ownershipTransfers'),
      orderBy('receivedAt', 'desc')
    );

    return onSnapshot(
      transfersQuery,
      (querySnapshot) => {
        const transfers = querySnapshot.docs.map((transferDoc) => {
          const data = transferDoc.data();
          return {
            id: transferDoc.id,
            playlistId: data.playlistId || '',
            playlistName: data.playlistName || 'Playlist',
            previousOwnerId: data.previousOwnerId || '',
            receivedAt: parseFirestoreDate(data.receivedAt)
          } as OwnershipTransferNotification;
        });

        callback(transfers);
      },
      (error) => {
        Logger.error('Error in ownership transfers subscription:', error);
      }
    );
  }

  static async deleteOwnershipTransfer(
    userId: string,
    transferId: string
  ): Promise<void> {
    try {
      const transferRef = doc(
        db,
        'users',
        userId,
        'ownershipTransfers',
        transferId
      );
      await deleteDoc(transferRef);
    } catch (error) {
      Logger.error('Error deleting ownership transfer:', error);
      throw error;
    }
  }

  // ===== PERMISSIONS CHECK =====

  static async canUserEditPlaylist(
    playlistId: string,
    userId: string
  ): Promise<boolean> {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) return false;

    const isParticipant = playlist.participantIds.includes(userId);

    // Owner can always edit
    if (playlist.ownerId === userId) return true;

    // PRIVATE playlists: only participants can edit
    if (playlist.visibility === 'private') {
      return isParticipant;
    }

    // PUBLIC playlists: depends on editPermissions
    if (playlist.visibility === 'public') {
      if (playlist.editPermissions === 'everyone') {
        // Everyone can edit (even non-participants)
        return true;
      } else if (playlist.editPermissions === 'invited') {
        // Only participants can edit
        return isParticipant;
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

    const isParticipant = playlist.participantIds.includes(userId);

    // Owner can always invite
    if (playlist.ownerId === userId) return true;

    // PRIVATE playlists: only participants can invite
    if (playlist.visibility === 'private') {
      return isParticipant;
    }

    // PUBLIC playlists: depends on editPermissions
    if (playlist.visibility === 'public') {
      if (playlist.editPermissions === 'everyone') {
        // Everyone can invite in public playlists
        return true;
      } else if (playlist.editPermissions === 'invited') {
        // Only participants can invite
        return isParticipant;
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
    return playlist.participantIds.includes(userId);
  }
}

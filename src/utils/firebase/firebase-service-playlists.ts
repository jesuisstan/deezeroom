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

export interface MusicTrack {
  id: string;
  trackId: string; // Deezer track ID
  title: string;
  artist: string;
  album?: string;
  duration: number;
  previewUrl?: string;
  coverUrl?: string;

  // Order management
  position: number;

  // Who added and when
  addedBy: string;
  addedAt: any;

  // Real-time sync
  lastModifiedBy: string;
  lastModifiedAt: any;
}

export interface PlaylistParticipant {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  displayName?: string;
  email?: string;
}

export interface PlaylistInvitation {
  id: string;
  playlistId: string;
  playlistName?: string; // Название плейлиста для отображения
  userId: string;
  invitedBy: string;
  invitedAt: Date;
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
    createdBy: string
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
      participants: [
        {
          userId: createdBy,
          role: 'owner' as const,
          joinedAt: new Date()
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
    track: Omit<
      MusicTrack,
      'id' | 'addedAt' | 'lastModifiedAt' | 'lastModifiedBy' | 'position'
    >,
    addedBy: string
  ): Promise<string> {
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
      const newPosition = playlist.trackCount + 1;

      const trackData = {
        ...track,
        position: newPosition,
        addedBy,
        addedAt: serverTimestamp(),
        lastModifiedBy: addedBy,
        lastModifiedAt: serverTimestamp()
      };

      const trackRef = doc(
        collection(db, this.collection, playlistId, this.tracksCollection)
      );
      transaction.set(trackRef, trackData);

      // Update playlist metadata
      transaction.update(playlistRef, {
        trackCount: increment(1),
        totalDuration: increment(track.duration),
        updatedAt: serverTimestamp(),
        lastModifiedBy: addedBy,
        version: increment(1)
      });

      return trackRef.id;
    });
  }

  static async removeTrackFromPlaylist(
    playlistId: string,
    trackId: string,
    userId: string
  ): Promise<void> {
    // Check if user has permission to remove tracks
    const canEdit = await this.canUserEditPlaylist(playlistId, userId);
    if (!canEdit) {
      throw new Error(
        'You do not have permission to remove tracks from this playlist'
      );
    }

    await runTransaction(db, async (transaction) => {
      const trackRef = doc(
        db,
        this.collection,
        playlistId,
        this.tracksCollection,
        trackId
      );
      const trackDoc = await transaction.get(trackRef);

      if (!trackDoc.exists()) {
        throw new Error('Track not found');
      }

      const track = trackDoc.data() as MusicTrack;
      const playlistRef = doc(db, this.collection, playlistId);

      // Delete track
      transaction.delete(trackRef);

      // Update playlist metadata
      transaction.update(playlistRef, {
        trackCount: increment(-1),
        totalDuration: increment(-track.duration),
        updatedAt: serverTimestamp(),
        version: increment(1)
      });
    });
  }

  static async reorderTrack(
    playlistId: string,
    trackId: string,
    newPosition: number
  ): Promise<void> {
    const trackRef = doc(
      db,
      this.collection,
      playlistId,
      this.tracksCollection,
      trackId
    );

    await updateDoc(trackRef, {
      position: newPosition,
      lastModifiedAt: serverTimestamp()
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
        const dateA =
          a.invitedAt instanceof Date ? a.invitedAt : new Date(a.invitedAt);
        const dateB =
          b.invitedAt instanceof Date ? b.invitedAt : new Date(b.invitedAt);
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
    userId: string,
    role: 'editor' | 'viewer' = 'editor'
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

        // Add user to participants with additional info from invitation
        const updatedParticipants = [
          ...playlist.participants,
          {
            userId,
            role,
            joinedAt: new Date(),
            displayName: invitation.displayName,
            email: invitation.email
          }
        ];

        transaction.update(playlistRef, {
          participants: updatedParticipants,
          updatedAt: serverTimestamp(),
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

      // Update invitation status
      await updateDoc(invitationRef, {
        status: 'declined'
      });

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
    callback: (tracks: MusicTrack[]) => void
  ) {
    const tracksRef = collection(
      db,
      this.collection,
      playlistId,
      this.tracksCollection
    );
    const q = query(tracksRef, orderBy('position', 'asc'));

    return onSnapshot(q, (querySnapshot) => {
      const tracks = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as MusicTrack[];
      callback(tracks);
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
        ...doc.data()
      })) as PlaylistInvitation[];
      callback(invitations);
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

    // Check if user is participant with edit rights
    const participant = playlist.participants.find((p) => p.userId === userId);
    if (!participant) return false;

    // Check edit permissions
    if (playlist.editPermissions === 'everyone') {
      return participant.role === 'editor' || participant.role === 'owner';
    } else if (playlist.editPermissions === 'invited') {
      return participant.role === 'editor' || participant.role === 'owner';
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

    // Check if user is participant with edit rights (editors can invite)
    const participant = playlist.participants.find((p) => p.userId === userId);
    if (!participant) return false;

    return participant.role === 'editor' || participant.role === 'owner';
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

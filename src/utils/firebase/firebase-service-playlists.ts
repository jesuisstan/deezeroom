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
    trackId: string
  ): Promise<void> {
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
    invitedBy: string
  ): Promise<string> {
    const invitationData = {
      userId,
      invitedBy,
      invitedAt: new Date(),
      status: 'pending' as const
    };

    const docRef = await addDoc(
      collection(db, this.collection, playlistId, this.invitationsCollection),
      invitationData
    );

    return docRef.id;
  }

  static async acceptInvitation(
    playlistId: string,
    invitationId: string,
    userId: string,
    role: 'editor' | 'viewer' = 'editor'
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const invitationRef = doc(
        db,
        this.collection,
        playlistId,
        this.invitationsCollection,
        invitationId
      );
      const playlistRef = doc(db, this.collection, playlistId);

      // Update invitation status
      transaction.update(invitationRef, {
        status: 'accepted'
      });

      // Add user to participants
      const playlistDoc = await transaction.get(playlistRef);
      const playlist = playlistDoc.data() as Playlist;

      const updatedParticipants = [
        ...playlist.participants,
        {
          userId,
          role,
          joinedAt: new Date()
        }
      ];

      transaction.update(playlistRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp(),
        version: increment(1)
      });
    });
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

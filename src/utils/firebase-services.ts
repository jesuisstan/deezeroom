import { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

import { db } from '@/utils/firebase-init';

// Remove all undefined values recursively to satisfy Firestore constraints
// Preserve Firestore sentinels (serverTimestamp) and Timestamp instances
const removeUndefinedDeep = (obj: any): any => {
  if (obj === undefined || obj === null) return obj;
  // Preserve FieldValue (has _methodName) and Timestamp
  if (
    (typeof obj === 'object' && obj !== null && (obj as any)._methodName) ||
    obj instanceof Timestamp ||
    (typeof obj?.toDate === 'function' && typeof obj?.toMillis === 'function')
  ) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((v) => v !== undefined)
      .map((v) => removeUndefinedDeep(v));
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== undefined) {
        result[key] = removeUndefinedDeep(value);
      }
    });
    return result;
  }
  return obj;
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  publicInfo?: {
    bio?: string;
    location?: string;
  };
  privateInfo?: {
    phone?: string;
    birthDate?: string;
  };
  musicPreferences?: {
    favoriteGenres: string[];
    favoriteArtists: string[];
  };
  createdAt: any;
  updatedAt: any;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  spotifyId?: string;
  deezerId?: string;
  addedBy: string;
  addedAt: any;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  isPublic: boolean;
  tracks: MusicTrack[];
  createdAt: any;
  updatedAt: any;
}

export interface Vote {
  id: string;
  trackId: string;
  userId: string;
  playlistId: string;
  voteType: 'up' | 'down';
  createdAt: any;
}

export class UserService {
  private static collection = 'users';

  static async createOrUpdateUser(
    user: User,
    additionalData?: Partial<UserProfile>
  ): Promise<void> {
    try {
      const userRef = doc(db, this.collection, user.uid);
      const existingSnap = await getDoc(userRef);

      // createdAt только при первом создании
      const baseData: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email || '',
        displayName:
          user.displayName || (user.email ? user.email.split('@')[0] : ''),
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      const dataToWrite = existingSnap.exists()
        ? baseData
        : { ...baseData, createdAt: Timestamp.now() };

      const userData = removeUndefinedDeep(dataToWrite) as Partial<UserProfile>;

      await setDoc(userRef, userData, { merge: true });
      console.log('User profile created/updated successfully');
    } catch (error) {
      console.error('Error in createOrUpdateUser:', error);
      throw error;
    }
  }

  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, this.collection, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  }

  static async updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
  ): Promise<void> {
    const userRef = doc(db, this.collection, uid);
    const cleaned = removeUndefinedDeep({
      ...data,
      updatedAt: serverTimestamp()
    });
    await setDoc(userRef, cleaned, { merge: true });
  }

  // Subscribe to user profile changes
  static subscribeToUserProfile(
    uid: string,
    callback: (user: UserProfile | null) => void
  ) {
    const userRef = doc(db, this.collection, uid);
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as UserProfile);
      } else {
        callback(null);
      }
    });
  }
}

export class PlaylistService {
  private static collection = 'playlists';

  static async createPlaylist(
    data: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const playlistData = {
      ...data,
      tracks: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, this.collection), playlistData);
    return docRef.id;
  }

  // Get playlist by ID
  static async getPlaylist(id: string): Promise<Playlist | null> {
    const playlistRef = doc(db, this.collection, id);
    const playlistSnap = await getDoc(playlistRef);

    if (playlistSnap.exists()) {
      return { id: playlistSnap.id, ...playlistSnap.data() } as Playlist;
    }
    return null;
  }

  // Get user playlists
  static async getUserPlaylists(userId: string): Promise<Playlist[]> {
    const q = query(
      collection(db, this.collection),
      where('createdBy', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Playlist
    );
  }

  // Get public playlists
  static async getPublicPlaylists(): Promise<Playlist[]> {
    const q = query(
      collection(db, this.collection),
      where('isPublic', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(20)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Playlist
    );
  }

  // Add track to playlist
  static async addTrackToPlaylist(
    playlistId: string,
    track: Omit<MusicTrack, 'id' | 'addedAt'>
  ): Promise<void> {
    const playlistRef = doc(db, this.collection, playlistId);
    const trackData = {
      ...track,
      id: Date.now().toString(), // Простой ID для трека
      addedAt: serverTimestamp()
    };

    await updateDoc(playlistRef, {
      tracks: [
        ...((await this.getPlaylist(playlistId))?.tracks || []),
        trackData
      ],
      updatedAt: serverTimestamp()
    });
  }

  // Remove track from playlist
  static async removeTrackFromPlaylist(
    playlistId: string,
    trackId: string
  ): Promise<void> {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) return;

    const updatedTracks = playlist.tracks.filter(
      (track) => track.id !== trackId
    );
    const playlistRef = doc(db, this.collection, playlistId);

    await updateDoc(playlistRef, {
      tracks: updatedTracks,
      updatedAt: serverTimestamp()
    });
  }

  // Subscribe to playlist changes
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
}

// Service for working with voting
export class VoteService {
  private static collection = 'votes';

  // Add vote for track
  static async addVote(vote: Omit<Vote, 'id' | 'createdAt'>): Promise<string> {
    const voteData = {
      ...vote,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, this.collection), voteData);
    return docRef.id;
  }

  // Get votes for track
  static async getTrackVotes(
    trackId: string,
    playlistId: string
  ): Promise<Vote[]> {
    const q = query(
      collection(db, this.collection),
      where('trackId', '==', trackId),
      where('playlistId', '==', playlistId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Vote
    );
  }

  // Remove user vote
  static async removeUserVote(
    trackId: string,
    userId: string,
    playlistId: string
  ): Promise<void> {
    const q = query(
      collection(db, this.collection),
      where('trackId', '==', trackId),
      where('userId', '==', userId),
      where('playlistId', '==', playlistId)
    );

    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }
}

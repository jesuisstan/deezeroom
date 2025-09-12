import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';

import { db } from '@/utils/firebase/firebase-init';

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

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';

// Типы данных
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

// Сервис для работы с пользователями
export class UserService {
  private static collection = 'users';

  // Создать или обновить профиль пользователя
  static async createOrUpdateUser(
    user: User,
    additionalData?: Partial<UserProfile>
  ): Promise<void> {
    const userRef = doc(db, this.collection, user.uid);
    const userData: Partial<UserProfile> = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    await updateDoc(userRef, userData);
  }

  // Получить профиль пользователя
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, this.collection, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  }

  // Обновить профиль пользователя
  static async updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
  ): Promise<void> {
    const userRef = doc(db, this.collection, uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  // Подписаться на изменения профиля пользователя
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

// Сервис для работы с плейлистами
export class PlaylistService {
  private static collection = 'playlists';

  // Создать новый плейлист
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

  // Получить плейлист по ID
  static async getPlaylist(id: string): Promise<Playlist | null> {
    const playlistRef = doc(db, this.collection, id);
    const playlistSnap = await getDoc(playlistRef);

    if (playlistSnap.exists()) {
      return { id: playlistSnap.id, ...playlistSnap.data() } as Playlist;
    }
    return null;
  }

  // Получить плейлисты пользователя
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

  // Получить публичные плейлисты
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

  // Добавить трек в плейлист
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

  // Удалить трек из плейлиста
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

  // Подписаться на изменения плейлиста
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

// Сервис для работы с голосованием
export class VoteService {
  private static collection = 'votes';

  // Добавить голос за трек
  static async addVote(vote: Omit<Vote, 'id' | 'createdAt'>): Promise<string> {
    const voteData = {
      ...vote,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, this.collection), voteData);
    return docRef.id;
  }

  // Получить голоса для трека
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

  // Удалить голос пользователя
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

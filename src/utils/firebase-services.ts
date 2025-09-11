import { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
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
  authProviders?: {
    google?: {
      linked: boolean;
      linkedAt?: any;
      providerId: string;
      email: string;
    };
    emailPassword?: {
      linked: boolean;
      linkedAt?: any;
      providerId: string;
      email: string;
    };
  };
  createdAt: any;
  updatedAt: any;
  emailVerified: boolean;
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

  // Helper function to detect auth providers from Firebase user
  private static getAuthProvidersInfo(user: User) {
    const providers: UserProfile['authProviders'] = {};

    if (user.providerData && user.providerData.length > 0) {
      user.providerData.forEach((provider) => {
        if (provider.providerId === 'google.com') {
          providers.google = {
            linked: true,
            linkedAt: serverTimestamp(),
            providerId: provider.providerId,
            email: provider.email || ''
          };
        } else if (provider.providerId === 'password') {
          providers.emailPassword = {
            linked: true,
            linkedAt: serverTimestamp(),
            providerId: provider.providerId,
            email: provider.email || ''
          };
        }
      });
    }

    return providers;
  }

  static async createOrUpdateUser(
    user: User,
    additionalData?: Partial<UserProfile>
  ): Promise<void> {
    try {
      const userRef = doc(db, this.collection, user.uid);
      const existingSnap = await getDoc(userRef);

      // Get current auth providers (source of truth)
      const currentProviders = this.getAuthProvidersInfo(user);

      // "createdAt" only when first created
      const baseData: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email || '',
        displayName:
          user.displayName || (user.email ? user.email.split('@')[0] : ''),
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
        authProviders: currentProviders,
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

  // Update auth providers information for existing user
  static async updateAuthProviders(user: User): Promise<void> {
    try {
      const userRef = doc(db, this.collection, user.uid);
      const existingSnap = await getDoc(userRef);

      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as UserProfile;
        const currentProviders = this.getAuthProvidersInfo(user);

        // Merge: keep only CURRENT providers, but preserve old linkedAt if existed
        const merged: UserProfile['authProviders'] = {};
        (
          Object.keys(currentProviders) as (keyof NonNullable<
            UserProfile['authProviders']
          >)[]
        ).forEach((key) => {
          const current = (currentProviders as any)[key];
          const previous = (existingData.authProviders as any)?.[key];
          (merged as any)[key] = {
            ...(previous || {}),
            ...current,
            linkedAt: previous?.linkedAt ?? current?.linkedAt
          };
        });

        await updateDoc(userRef, {
          authProviders: merged,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating auth providers:', error);
      throw error;
    }
  }

  // Manual linking with Google account
  static async linkWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      const { GoogleSignin } = await import(
        '@react-native-google-signin/google-signin'
      );
      const { GoogleAuthProvider, linkWithCredential } = await import(
        'firebase/auth'
      );
      const { auth } = await import('@/utils/firebase-init');

      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'No authenticated user' };
      }

      // Check if Google is already linked
      const isGoogleLinked = currentUser.providerData.some(
        (provider) => provider.providerId === 'google.com'
      );

      if (isGoogleLinked) {
        return { success: false, error: 'Google account is already linked' };
      }

      // Get Google credentials
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        return { success: false, error: 'Failed to get Google ID token' };
      }

      // Create Google credential
      const credential = GoogleAuthProvider.credential(idToken);

      // Link with current user
      await linkWithCredential(currentUser, credential);

      // Reload user to get updated info
      await currentUser.reload();

      // Update auth providers in database
      await this.updateAuthProviders(currentUser);

      console.log('Successfully linked Google account');
      return { success: true };
    } catch (error: any) {
      console.log('Error linking Google account:', error);

      // Handle specific Firebase errors
      if (error.code === 'auth/provider-already-linked') {
        return { success: false, error: 'Google account is already linked' };
      } else if (error.code === 'auth/credential-already-in-use') {
        return {
          success: false,
          error: 'This Google account is already used by another user'
        };
      } else if (error.code === 'auth/email-already-in-use') {
        return {
          success: false,
          error: 'Email address is already in use by another account'
        };
      } else if (error.code === 'auth/user-token-expired') {
        return {
          success: false,
          error: 'Google account token expired'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to link Google account'
      };
    }
  }

  // Unlink Google account from current user
  static async unlinkGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      const { unlink } = await import('firebase/auth');
      const { auth } = await import('@/utils/firebase-init');

      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'No authenticated user' };
      }

      // Ensure there is at least one other sign-in method left
      if (currentUser.providerData.length <= 1) {
        return {
          success: false,
          error: 'Cannot unlink the only sign-in method'
        };
      }

      await unlink(currentUser, 'google.com');
      await currentUser.reload();

      // Explicitly remove google subfield from Firestore profile
      const userRef = doc(db, this.collection, currentUser.uid);
      await updateDoc(userRef, {
        'authProviders.google': deleteField(),
        updatedAt: serverTimestamp()
      });

      // Then overwrite with the CURRENT providers set
      await this.updateAuthProviders(currentUser);

      return { success: true };
    } catch (error: any) {
      console.error('Error unlinking Google account:', error);
      return {
        success: false,
        error: error?.message || 'Failed to unlink Google account'
      };
    }
  }

  // Manual linking with email+password
  static async linkWithEmailPassword(
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { EmailAuthProvider, linkWithCredential, sendEmailVerification } =
        await import('firebase/auth');
      const { auth } = await import('@/utils/firebase-init');

      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'No authenticated user' };
      }

      // Check if email+password is already linked
      const isEmailPasswordLinked = currentUser.providerData.some(
        (provider) => provider.providerId === 'password'
      );

      if (isEmailPasswordLinked) {
        return { success: false, error: 'Email/Password is already linked' };
      }

      // Validate input
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      if (password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters'
        };
      }

      // Check if email matches current user's email
      if (
        currentUser.email &&
        currentUser.email !== email.trim().toLowerCase()
      ) {
        return {
          success: false,
          error: 'Email must match your current account email'
        };
      }

      // Create email credential
      const credential = EmailAuthProvider.credential(
        email.trim().toLowerCase(),
        password
      );

      // Link with current user
      await linkWithCredential(currentUser, credential);
      await currentUser.reload();

      if (!currentUser.emailVerified) {
        await sendEmailVerification(currentUser);
      }

      // Update auth providers in database
      await this.updateAuthProviders(currentUser);

      // Update profile data to let it trigger AuthGuard redirect to verify-email screen
      await this.updateUserProfile(currentUser.uid, {
        emailVerified: currentUser.emailVerified
      });
      console.log('Successfully linked email/password');
      return { success: true };
    } catch (error: any) {
      console.error('Error linking email/password:', error);

      // Handle specific Firebase errors
      if (error.code === 'auth/provider-already-linked') {
        return { success: false, error: 'Email/Password is already linked' };
      } else if (error.code === 'auth/credential-already-in-use') {
        return {
          success: false,
          error: 'This email is already used by another user'
        };
      } else if (error.code === 'auth/email-already-in-use') {
        return {
          success: false,
          error: 'Email address is already in use by another account'
        };
      } else if (error.code === 'auth/weak-password') {
        return {
          success: false,
          error: 'Password is too weak. Use at least 6 characters'
        };
      } else if (error.code === 'auth/invalid-email') {
        return {
          success: false,
          error: 'Invalid email address'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to link email/password'
      };
    }
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

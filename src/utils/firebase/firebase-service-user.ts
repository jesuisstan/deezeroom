import { User } from 'firebase/auth';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

import { Logger } from '@/components/modules/logger';
import { DeezerArtist } from '@/utils/deezer/deezer-types';
import { getFirebaseErrorMessage } from '@/utils/firebase/firebase-error-handler';
import { db } from '@/utils/firebase/firebase-init';
import {
  setFriendsProfileDoc,
  setPublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';
import { StorageService } from '@/utils/firebase/firebase-service-storage';

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
    locationName?: string;
    locationCoords?: { lat: number; lng: number } | null;
  };
  privateInfo?: {
    phone?: string;
    birthDate?: string;
  };
  musicPreferences?: {
    favoriteGenres: string[];
    // Store only IDs for source-of-truth freshness
    favoriteArtistIds?: string[];
    // Deprecated: kept for backward compatibility (render only)
    favoriteArtists?: DeezerArtist[];
  };
  favoriteTracks?: string[]; // Array of track IDs
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

      // If user exists, merge auth providers to preserve linkedAt timestamps
      let finalAuthProviders = currentProviders;
      let needsUpdate = false;

      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as UserProfile;

        // Merge: keep only CURRENT providers, but preserve old linkedAt if existed
        // This will automatically remove unlinked providers from the database
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

        // Important: Only keep CURRENT providers - this removes unlinked ones
        finalAuthProviders = merged;

        // Log removed providers for debugging
        const existingKeys = Object.keys(existingData.authProviders || {});
        const currentKeys = Object.keys(currentProviders);
        const removedKeys = existingKeys.filter(
          (key) => !currentKeys.includes(key)
        );

        if (removedKeys.length > 0) {
          Logger.info(
            'Removed unlinked providers',
            removedKeys,
            '🔥 Firebase UserService'
          );
        }

        // Check if providers actually changed to avoid unnecessary updates
        const existingProvidersStr = JSON.stringify(
          existingData.authProviders || {}
        );
        const newProvidersStr = JSON.stringify(finalAuthProviders);
        needsUpdate = existingProvidersStr !== newProvidersStr;

        if (!needsUpdate) {
          Logger.info(
            'No provider changes detected, skipping update',
            null,
            '🔥 Firebase UserService'
          );
        }
      }

      // "createdAt" only when first created
      const baseData: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email || '',
        authProviders: finalAuthProviders,
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      // Only update displayName and photoURL if they don't exist or are empty
      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as UserProfile;

        // Only set displayName if current one is empty or missing
        if (
          !existingData.displayName ||
          existingData.displayName.trim() === ''
        ) {
          baseData.displayName =
            user.displayName || (user.email ? user.email.split('@')[0] : '');
        }

        // Only set photoURL if current one is empty or missing
        if (!existingData.photoURL || existingData.photoURL.trim() === '') {
          if (user.photoURL) {
            baseData.photoURL = user.photoURL;
          }
        }
      } else {
        // For new users, set both displayName and photoURL
        baseData.displayName =
          user.displayName || (user.email ? user.email.split('@')[0] : '');
        if (user.photoURL) {
          baseData.photoURL = user.photoURL;
        }
        // Initialize favoriteTracks for new users
        baseData.favoriteTracks = [];
      }

      // Only write to Firestore if there are actual changes or it's a new user
      if (!existingSnap.exists() || needsUpdate || additionalData) {
        const dataToWrite = existingSnap.exists()
          ? baseData
          : { ...baseData, createdAt: Timestamp.now() };

        const userData = removeUndefinedDeep(
          dataToWrite
        ) as Partial<UserProfile>;

        await setDoc(userRef, userData, { merge: true });
        Logger.info(
          'User profile created/updated successfully',
          null,
          '🔥 Firebase UserService'
        );

        // Mirror public/friends-visible fields to subdocuments for rules-based access
        try {
          const existingData = existingSnap.exists()
            ? (existingSnap.data() as UserProfile)
            : undefined;

          const finalDisplayName =
            (userData as any).displayName ??
            existingData?.displayName ??
            user.displayName ??
            (user.email ? user.email.split('@')[0] : '');
          const finalPhotoURL =
            (userData as any).photoURL ??
            existingData?.photoURL ??
            user.photoURL ??
            '';
          const finalEmail =
            (userData as any).email ?? existingData?.email ?? user.email ?? '';
          const finalMusic =
            (userData as any).musicPreferences ??
            existingData?.musicPreferences;

          await setPublicProfileDoc(
            user.uid,
            removeUndefinedDeep({
              displayName: finalDisplayName,
              displayNameLowercase:
                typeof finalDisplayName === 'string'
                  ? finalDisplayName.toLowerCase()
                  : undefined,
              email:
                typeof finalEmail === 'string'
                  ? finalEmail.toLowerCase()
                  : undefined,
              photoURL: finalPhotoURL,
              musicPreferences: finalMusic
                ? {
                    favoriteGenres: finalMusic.favoriteGenres,
                    favoriteArtistIds: finalMusic.favoriteArtistIds
                  }
                : undefined
            })
          );

          const finalPublicInfo =
            (userData as any).publicInfo ?? existingData?.publicInfo;
          const finalFavorites =
            (userData as any).favoriteTracks ?? existingData?.favoriteTracks;

          await setFriendsProfileDoc(
            user.uid,
            removeUndefinedDeep({
              bio: finalPublicInfo?.bio,
              location: finalPublicInfo?.location,
              locationName: (finalPublicInfo as any)?.locationName,
              locationCoords: (finalPublicInfo as any)?.locationCoords ?? null,
              favoriteTracks: finalFavorites
            })
          );
        } catch (mirrorErr) {
          Logger.warn(
            'Failed to mirror profile to subdocs',
            mirrorErr,
            '🔥 Firebase UserService'
          );
        }
      } else {
        Logger.info(
          'Skipping Firestore write - no changes detected',
          null,
          '🔥 Firebase UserService'
        );
      }
    } catch (error) {
      Logger.error(
        'Error in createOrUpdateUser',
        error,
        '🔥 Firebase UserService'
      );
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

    // Mirror updates into public/friends subdocs as needed
    try {
      const toPublic: any = {};
      if (typeof data.displayName !== 'undefined') {
        toPublic.displayName = data.displayName;
        toPublic.displayNameLowercase =
          typeof data.displayName === 'string'
            ? data.displayName.toLowerCase()
            : undefined;
      }
      if (typeof data.email !== 'undefined') {
        toPublic.email =
          typeof data.email === 'string' ? data.email.toLowerCase() : undefined;
      }
      if (typeof data.photoURL !== 'undefined')
        toPublic.photoURL = data.photoURL;
      if (typeof data.musicPreferences !== 'undefined') {
        toPublic.musicPreferences = {
          favoriteGenres: data.musicPreferences?.favoriteGenres,
          favoriteArtistIds: data.musicPreferences?.favoriteArtistIds
        };
      }
      if (Object.keys(removeUndefinedDeep(toPublic) || {}).length > 0) {
        await setPublicProfileDoc(uid, removeUndefinedDeep(toPublic));
      }

      const toFriends: any = {};
      if (typeof (data as any).publicInfo !== 'undefined') {
        const pi: any = (data as any).publicInfo;
        toFriends.bio = pi?.bio;
        toFriends.location = pi?.location;
        toFriends.locationName = pi?.locationName;
        toFriends.locationCoords = pi?.locationCoords ?? null;
      }
      if (typeof data.favoriteTracks !== 'undefined') {
        toFriends.favoriteTracks = data.favoriteTracks;
      }
      if (Object.keys(removeUndefinedDeep(toFriends) || {}).length > 0) {
        await setFriendsProfileDoc(uid, removeUndefinedDeep(toFriends));
      }
    } catch (mirrorErr) {
      Logger.warn(
        'Failed to mirror update to subdocs',
        mirrorErr,
        '🔥 Firebase UserService'
      );
    }
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
      Logger.error(
        'Error updating auth providers',
        error,
        '🔥 Firebase UserService'
      );
      throw error;
    }
  }

  // Manual linking with Google account
  static async linkWithGoogle(): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const { GoogleSignin } = await import(
        '@react-native-google-signin/google-signin'
      );
      const { GoogleAuthProvider, linkWithCredential } = await import(
        'firebase/auth'
      );
      const { auth } = await import('@/utils/firebase/firebase-init');

      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, message: 'No authenticated user' };
      }

      // Ensure a user profile document exists in Firestore
      const userRef = doc(db, this.collection, currentUser.uid);
      const profileSnap = await getDoc(userRef);
      if (!profileSnap.exists()) {
        return { success: false, message: 'User profile not found' };
      }

      // Check if Google is already linked
      const isGoogleLinked = currentUser.providerData.some(
        (provider) => provider.providerId === 'google.com'
      );

      if (isGoogleLinked) {
        return { success: false, message: 'Google account is already linked' };
      }

      // Get Google credentials
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      if (!idToken) {
        return { success: false, message: 'Failed to get Google ID token' };
      }

      // Create Google credential
      const credential = GoogleAuthProvider.credential(idToken);

      // Link with current user
      await linkWithCredential(currentUser, credential);

      // Reload user to get updated info
      await currentUser.reload();

      // Update auth providers in database
      await this.updateAuthProviders(currentUser);

      Logger.info(
        'Successfully linked Google account',
        null,
        '🔥 Firebase UserService'
      );
      return { success: true, message: 'Google account linked successfully' };
    } catch (error: any) {
      Logger.error(
        'Error linking Google account',
        error,
        '🔥 Firebase UserService'
      );
      return {
        success: false,
        message:
          getFirebaseErrorMessage(error) || 'Failed to link Google account'
      };
    }
  }

  // Unlink Google account from current user
  static async unlinkGoogle(): Promise<{ success: boolean; message?: string }> {
    try {
      const { unlink } = await import('firebase/auth');
      const { auth } = await import('@/utils/firebase/firebase-init');

      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, message: 'No authenticated user' };
      }

      // Ensure there is at least one other sign-in method left
      if (currentUser.providerData.length <= 1) {
        return {
          success: false,
          message: 'Cannot unlink the only sign-in method'
        };
      }

      // Unlink from Firebase Auth
      await unlink(currentUser, 'google.com');
      await currentUser.reload();

      // Update Firestore with the current auth providers (without Google)
      const userRef = doc(db, this.collection, currentUser.uid);

      // Get the updated providers info after unlinking
      const updatedProviders = this.getAuthProvidersInfo(currentUser);

      await updateDoc(userRef, {
        authProviders: updatedProviders,
        updatedAt: serverTimestamp()
      });

      return { success: true, message: 'Google account unlinked successfully' };
    } catch (error: any) {
      Logger.error(
        'Error unlinking Google account',
        error,
        '🔥 Firebase UserService'
      );
      return {
        success: false,
        message:
          getFirebaseErrorMessage(error) || 'Failed to unlink Google account'
      };
    }
  }

  // Manual linking with email+password
  static async linkWithEmailPassword(
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { EmailAuthProvider, linkWithCredential, sendEmailVerification } =
        await import('firebase/auth');
      const { auth } = await import('@/utils/firebase/firebase-init');

      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, message: 'No authenticated user' };
      }

      // Ensure a user profile document exists BEFORE linking
      const userRef = doc(db, this.collection, currentUser.uid);
      const profileSnap = await getDoc(userRef);
      if (!profileSnap.exists()) {
        return { success: false, message: 'User profile not found' };
      }

      // Check if email+password is already linked
      const isEmailPasswordLinked = currentUser.providerData.some(
        (provider) => provider.providerId === 'password'
      );

      if (isEmailPasswordLinked) {
        return { success: false, message: 'Email/Password is already linked' };
      }

      // Validate input
      if (!email || !password) {
        return { success: false, message: 'Email and password are required' };
      }

      if (password.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters'
        };
      }

      // Check if email matches current user's email
      if (
        currentUser.email &&
        currentUser.email !== email.trim().toLowerCase()
      ) {
        return {
          success: false,
          message: 'Email must match your current account email'
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
      Logger.info(
        'Successfully linked email/password',
        null,
        '🔥 Firebase UserService'
      );
      return { success: true, message: 'Email/Password linked successfully' };
    } catch (error: any) {
      Logger.error(
        'Error linking email/password',
        error,
        '🔥 Firebase UserService'
      );
      return {
        success: false,
        message:
          getFirebaseErrorMessage(error) || 'Failed to link email/password'
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

  // Upload user avatar and update profile
  static async uploadUserAvatar(
    uid: string,
    imageUri: string
  ): Promise<{ success: boolean; photoURL?: string; error?: string }> {
    try {
      // Upload image to Firebase Storage
      const photoURL = await StorageService.uploadUserAvatar(uid, imageUri);

      // Update user profile
      await this.updateUserProfile(uid, { photoURL });

      Logger.info(
        'Avatar uploaded successfully',
        { uid, photoURL },
        '🔥 Firebase UserService'
      );

      return { success: true, photoURL };
    } catch (error) {
      Logger.error('Error uploading avatar', error, '🔥 Firebase UserService');
      return {
        success: false,
        error: getFirebaseErrorMessage(error) || 'Failed to upload avatar'
      };
    }
  }

  // Delete user avatar
  static async deleteUserAvatar(
    uid: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current profile
      const profile = await this.getUserProfile(uid);
      if (!profile?.photoURL) {
        Logger.info('No avatar to delete', { uid }, '🔥 Firebase UserService');
        return { success: true }; // No avatar to delete
      }

      Logger.info(
        'Deleting avatar',
        { uid, photoURL: profile.photoURL },
        '🔥 Firebase UserService'
      );

      // Delete image from Storage only if it's a Firebase Storage URL
      if (
        profile.photoURL.startsWith('https://firebasestorage.googleapis.com')
      ) {
        try {
          await StorageService.deleteImage(profile.photoURL);
          Logger.info(
            'Avatar deleted from Storage',
            { uid },
            '🔥 Firebase UserService'
          );
        } catch (storageError) {
          Logger.warn(
            'Failed to delete from Storage, continuing with profile update',
            storageError,
            '🔥 Firebase UserService'
          );
          // Continue even if it fails to delete from Storage
        }
      } else {
        Logger.info(
          'Avatar is not from Firebase Storage, skipping Storage deletion',
          { uid },
          '🔥 Firebase UserService'
        );
      }

      // Update profile (always clear photoURL)
      await this.updateUserProfile(uid, { photoURL: '' });

      Logger.info(
        'Avatar deleted successfully',
        { uid },
        '🔥 Firebase UserService'
      );

      return { success: true };
    } catch (error) {
      Logger.error('Error deleting avatar', error, '🔥 Firebase UserService');
      return {
        success: false,
        error: getFirebaseErrorMessage(error) || 'Failed to delete avatar'
      };
    }
  }

  // Securely delete current user's account and related data
  static async deleteAccountWithPassword(
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { EmailAuthProvider, reauthenticateWithCredential, deleteUser } =
        await import('firebase/auth');
      const { auth } = await import('@/utils/firebase/firebase-init');

      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, message: 'No authenticated user' };
      }

      const normalizedInputEmail = email.trim().toLowerCase();
      const normalizedUserEmail = (currentUser.email || '')
        .trim()
        .toLowerCase();
      if (normalizedUserEmail !== normalizedInputEmail) {
        return {
          success: false,
          message: 'Entered email does not match your profile email'
        };
      }

      if (!password || password.length === 0) {
        return { success: false, message: 'Please enter your password' };
      }

      // Reauthenticate with email/password
      const credential = EmailAuthProvider.credential(
        normalizedInputEmail,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Capture uid before any auth changes
      const uid = currentUser.uid;

      // 1) Delete user-generated content from Firestore first (to keep permissions)
      // Delete votes
      const votesQ = query(collection(db, 'votes'), where('userId', '==', uid));
      const votesSnap = await getDocs(votesQ);
      await Promise.all(votesSnap.docs.map((d) => deleteDoc(d.ref)));

      // Delete playlists created by the user
      const playlistsQ = query(
        collection(db, 'playlists'),
        where('createdBy', '==', uid)
      );
      const playlistsSnap = await getDocs(playlistsQ);
      await Promise.all(playlistsSnap.docs.map((d) => deleteDoc(d.ref)));

      // Delete user profile document
      const userRef = doc(db, this.collection, uid);
      await deleteDoc(userRef);

      // 2) Delete the auth user
      await deleteUser(currentUser);

      return { success: true, message: 'Account deleted successfully' };
    } catch (error: any) {
      Logger.error('Error deleting account', error, '🔥 Firebase UserService');
      return {
        success: false,
        message: getFirebaseErrorMessage(error) || 'Failed to delete account'
      };
    }
  }

  // Add track to favorites
  static async addToFavorites(
    uid: string,
    trackId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const userRef = doc(db, this.collection, uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return { success: false, message: 'User profile not found' };
      }

      const userData = userSnap.data() as UserProfile;
      const currentFavorites = userData.favoriteTracks || [];

      if (currentFavorites.includes(trackId)) {
        return { success: false, message: 'Track is already in favorites' };
      }

      const updatedFavorites = [...currentFavorites, trackId];

      await updateDoc(userRef, {
        favoriteTracks: updatedFavorites,
        updatedAt: serverTimestamp()
      });

      // Mirror to friends profile subdoc
      try {
        await setFriendsProfileDoc(uid, { favoriteTracks: updatedFavorites });
      } catch (e) {
        Logger.warn(
          'Mirror addToFavorites failed',
          e,
          '🔥 Firebase UserService'
        );
      }

      Logger.info(
        'Track added to favorites',
        { uid, trackId },
        '🔥 Firebase UserService'
      );

      return { success: true, message: 'Track added to favorites' };
    } catch (error: any) {
      Logger.error(
        'Error adding track to favorites',
        error,
        '🔥 Firebase UserService'
      );
      return {
        success: false,
        message:
          getFirebaseErrorMessage(error) || 'Failed to add track to favorites'
      };
    }
  }

  // Remove track from favorites
  static async removeFromFavorites(
    uid: string,
    trackId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const userRef = doc(db, this.collection, uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return { success: false, message: 'User profile not found' };
      }

      const userData = userSnap.data() as UserProfile;
      const currentFavorites = userData.favoriteTracks || [];

      if (!currentFavorites.includes(trackId)) {
        return { success: false, message: 'Track is not in favorites' };
      }

      const updatedFavorites = currentFavorites.filter((id) => id !== trackId);

      await updateDoc(userRef, {
        favoriteTracks: updatedFavorites,
        updatedAt: serverTimestamp()
      });

      try {
        await setFriendsProfileDoc(uid, { favoriteTracks: updatedFavorites });
      } catch (e) {
        Logger.warn(
          'Mirror removeFromFavorites failed',
          e,
          '🔥 Firebase UserService'
        );
      }

      Logger.info(
        'Track removed from favorites',
        { uid, trackId },
        '🔥 Firebase UserService'
      );

      return { success: true, message: 'Track removed from favorites' };
    } catch (error: any) {
      Logger.error(
        'Error removing track from favorites',
        error,
        '🔥 Firebase UserService'
      );
      return {
        success: false,
        message:
          getFirebaseErrorMessage(error) ||
          'Failed to remove track from favorites'
      };
    }
  }

  // Toggle track favorite status
  static async toggleFavoriteTrack(
    uid: string,
    trackId: string
  ): Promise<{ success: boolean; isFavorite: boolean; message?: string }> {
    try {
      const userRef = doc(db, this.collection, uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return {
          success: false,
          isFavorite: false,
          message: 'User profile not found'
        };
      }

      const userData = userSnap.data() as UserProfile;
      const currentFavorites = userData.favoriteTracks || [];
      const isCurrentlyFavorite = currentFavorites.includes(trackId);

      let updatedFavorites: string[];
      let message: string;

      if (isCurrentlyFavorite) {
        updatedFavorites = currentFavorites.filter((id) => id !== trackId);
        message = 'Track removed from favorites';
      } else {
        updatedFavorites = [...currentFavorites, trackId];
        message = 'Track added to favorites';
      }

      await updateDoc(userRef, {
        favoriteTracks: updatedFavorites,
        updatedAt: serverTimestamp()
      });

      try {
        await setFriendsProfileDoc(uid, { favoriteTracks: updatedFavorites });
      } catch (e) {
        Logger.warn(
          'Mirror toggleFavorite failed',
          e,
          '🔥 Firebase UserService'
        );
      }

      Logger.info(
        'Track favorite status toggled',
        { uid, trackId, isFavorite: !isCurrentlyFavorite },
        '🔥 Firebase UserService'
      );

      return {
        success: true,
        isFavorite: !isCurrentlyFavorite,
        message
      };
    } catch (error: any) {
      Logger.error(
        'Error toggling track favorite status',
        error,
        '🔥 Firebase UserService'
      );
      return {
        success: false,
        isFavorite: false,
        message:
          getFirebaseErrorMessage(error) ||
          'Failed to toggle track favorite status'
      };
    }
  }

  // ===== USER SEARCH FOR INVITATIONS =====

  // Search users by email or display name
  static async searchUsers(
    searchQuery: string,
    limitCount: number = 10,
    excludeUserId?: string
  ): Promise<UserProfile[]> {
    try {
      const trimmed = searchQuery.trim();
      if (!trimmed) return [];

      const termLower = trimmed.toLowerCase();

      // IMPORTANT: Root /users docs are private by rules; search public profile subdocs instead
      // Primary: search by lowercase display name (if present)
      const lowerNameQuery = query(
        collectionGroup(db, 'public'),
        where('displayNameLowercase', '>=', termLower),
        where('displayNameLowercase', '<=', termLower + '\uf8ff'),
        limit(limitCount)
      );

      // Fallback: search by raw displayName for older docs without lowercase field
      const rawNameQuery = query(
        collectionGroup(db, 'public'),
        where('displayName', '>=', trimmed),
        where('displayName', '<=', trimmed + '\uf8ff'),
        limit(limitCount)
      );

      // Email exact match in public profile
      const emailQuery = query(
        collectionGroup(db, 'public'),
        where('email', '==', termLower),
        limit(limitCount)
      );

      // Run lowercase query first; if index is missing, fall back gracefully
      let lowerSnap: any = { docs: [] };
      try {
        lowerSnap = await getDocs(lowerNameQuery);
      } catch (e: any) {
        // If index missing or not ready, proceed with fallback only
        if (e?.code === 'failed-precondition') {
        } else {
          throw e;
        }
      }

      let rawSnap: any = { docs: [] };
      try {
        rawSnap = await getDocs(rawNameQuery);
      } catch (e) {
        // Propagate non-index errors
        throw e;
      }

      let emailSnap: any = { docs: [] };
      try {
        emailSnap = await getDocs(emailQuery);
      } catch {
        // Ignore if index missing; fallback queries will handle
      }

      const results = new Map<string, UserProfile>();

      const collect = (d: any) => {
        const data = d.data();
        const uid = d.ref.parent.parent?.id as string | undefined;
        if (!uid) return;
        if (excludeUserId && uid === excludeUserId) return;

        const user: any = {
          uid,
          email: data?.email || '',
          displayName: data?.displayName || '',
          photoURL: data?.photoURL,
          // Optional extras for UI; rest of fields omitted for privacy
          musicPreferences: data?.musicPreferences,
          createdAt: null,
          updatedAt: null,
          emailVerified: false
        };

        results.set(uid, user as UserProfile);
      };

      lowerSnap.docs.forEach(collect);
      rawSnap.docs.forEach(collect);
      emailSnap.docs.forEach(collect);

      return Array.from(results.values()).slice(0, limitCount);
    } catch (error) {
      Logger.error('Error searching users', error, '🔥 Firebase UserService');
      return [];
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const q = query(
        collection(db, this.collection),
        where('email', '==', normalizedEmail),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      const docData = doc.data();
      if (!docData) return null;
      return { id: doc.id, ...docData } as unknown as UserProfile;
    } catch (error) {
      Logger.error(
        'Error getting user by email',
        error,
        '🔥 Firebase UserService'
      );
      return null;
    }
  }

  // Get multiple users by their UIDs
  static async getUsersByIds(uids: string[]): Promise<UserProfile[]> {
    try {
      if (uids.length === 0) return [];

      // Firestore 'in' queries are limited to 10 items
      const chunks = [];
      for (let i = 0; i < uids.length; i += 10) {
        chunks.push(uids.slice(i, i + 10));
      }

      const allUsers: UserProfile[] = [];

      for (const chunk of chunks) {
        const q = query(
          collection(db, this.collection),
          where('uid', 'in', chunk)
        );
        const querySnapshot = await getDocs(q);

        querySnapshot.docs.forEach((doc) => {
          const docData = doc.data();
          if (docData) {
            allUsers.push({ id: doc.id, ...docData } as unknown as UserProfile);
          }
        });
      }

      return allUsers;
    } catch (error) {
      Logger.error(
        'Error getting users by IDs',
        error,
        '🔥 Firebase UserService'
      );
      return [];
    }
  }
}

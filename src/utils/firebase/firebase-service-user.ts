import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

import { getFirebaseErrorMessage } from '@/utils/firebase/firebase-error-handler';
import { db } from '@/utils/firebase/firebase-init';

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

      console.log('Successfully linked Google account');
      return { success: true, message: 'Google account linked successfully' };
    } catch (error: any) {
      console.log('Error linking Google account:', error);
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

      return { success: true, message: 'Google account unlinked successfully' };
    } catch (error: any) {
      console.error('Error unlinking Google account:', error);
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
      console.log('Successfully linked email/password');
      return { success: true, message: 'Email/Password linked successfully' };
    } catch (error: any) {
      console.log('Error linking email/password:', error);
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
      console.error('Error deleting account:', error);
      return {
        success: false,
        message: getFirebaseErrorMessage(error) || 'Failed to delete account'
      };
    }
  }
}

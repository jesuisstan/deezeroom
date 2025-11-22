import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Logger } from '@/modules/logger/LoggerModule';
import { db } from '@/utils/firebase/firebase-init';

export interface PublicProfileDoc {
  displayName?: string;
  // Lowercased display name for case-insensitive search
  displayNameLowercase?: string;
  photoURL?: string;
  bio?: string;
  favoriteArtistIds?: string[];
  favoriteTracks?: string[];
}

export interface PublicProfileWithId extends PublicProfileDoc {
  uid: string;
}

const USERS = 'users';

export async function getPublicProfileDoc(
  uid: string
): Promise<PublicProfileDoc | null> {
  try {
    const ref = doc(db, `${USERS}/${uid}/public/profile`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as PublicProfileDoc;
  } catch (error) {
    Logger.error('getPublicProfileDoc error', error, '👤 Profiles');
    return null;
  }
}

/**
 * Get public profiles for multiple user IDs in batch
 * Returns a map of userId -> PublicProfileDoc for efficient lookup
 */
export async function getPublicProfilesByUserIds(
  userIds: string[]
): Promise<Map<string, PublicProfileDoc>> {
  const profileMap = new Map<string, PublicProfileDoc>();

  if (!userIds || userIds.length === 0) {
    return profileMap;
  }

  // Remove duplicates
  const uniqueIds = Array.from(new Set(userIds));

  try {
    // Use Promise.all for parallel requests (Firestore handles up to 10 concurrent reads efficiently)
    // For larger batches, we could chunk them, but for typical playlist participants this should be fine
    const profilePromises = uniqueIds.map(async (uid) => {
      try {
        const ref = doc(db, `${USERS}/${uid}/public/profile`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          return { uid, profile: snap.data() as PublicProfileDoc };
        }
        return { uid, profile: null };
      } catch (error) {
        Logger.warn(`Failed to get public profile for ${uid}:`, error);
        return { uid, profile: null };
      }
    });

    const results = await Promise.all(profilePromises);

    results.forEach(({ uid, profile }) => {
      if (profile) {
        profileMap.set(uid, profile);
      }
    });
  } catch (error) {
    Logger.error('getPublicProfilesByUserIds error', error, '👤 Profiles');
  }

  return profileMap;
}

export async function setPublicProfileDoc(
  uid: string,
  data: Partial<PublicProfileDoc>
): Promise<void> {
  try {
    const ref = doc(db, `${USERS}/${uid}/public/profile`);
    await setDoc(ref, data, { merge: true });
  } catch (error) {
    Logger.error('setPublicProfileDoc error', error, '👤 Profiles');
    throw error;
  }
}

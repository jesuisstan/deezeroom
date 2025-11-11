import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Logger } from '@/components/modules/logger/LoggerModule';
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

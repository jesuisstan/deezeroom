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

export interface FriendsProfileDoc {
  email?: string;
  phone?: string;
  birthDate?: string;
  locationName?: string;
  locationCoords?: { lat: number; lng: number } | null;
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

export async function getFriendsProfileDoc(
  uid: string
): Promise<FriendsProfileDoc | null> {
  try {
    const ref = doc(db, `${USERS}/${uid}/friends/profile`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as FriendsProfileDoc;
  } catch (error) {
    Logger.error('getFriendsProfileDoc error', error, '👤 Profiles');
    return null;
  }
}

export async function setFriendsProfileDoc(
  uid: string,
  data: Partial<FriendsProfileDoc>
): Promise<void> {
  try {
    const ref = doc(db, `${USERS}/${uid}/friends/profile`);
    await setDoc(ref, data, { merge: true });
  } catch (error) {
    Logger.error('setFriendsProfileDoc error', error, '👤 Profiles');
    throw error;
  }
}

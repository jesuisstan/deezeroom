import { FirebaseError } from 'firebase/app';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

import { Logger } from '@/components/modules/logger/LoggerModule';
import { db } from '@/utils/firebase/firebase-init';

export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ConnectionDoc {
  userA: string; // lexicographically smaller uid
  userB: string; // lexicographically larger uid
  status: ConnectionStatus;
  createdAt?: any;
  updatedAt?: any;
  requestedBy?: string;
  respondedBy?: string;
}

export const pairKey = (a: string, b: string) =>
  a < b ? `${a}_${b}` : `${b}_${a}`;

const COLLECTION = 'connections';

export async function getConnectionBetween(
  uid1: string,
  uid2: string
): Promise<ConnectionDoc | null> {
  try {
    const id = pairKey(uid1, uid2);
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as ConnectionDoc;
  } catch (error) {
    // Permission-denied is expected for non-existing docs under strict rules.
    const err = error as FirebaseError;
    if (err?.code !== 'permission-denied') {
      Logger.error('getConnectionBetween error', error, '🤝 Connections');
    }
    return null;
  }
}

export async function isFriends(uid1: string, uid2: string) {
  const conn = await getConnectionBetween(uid1, uid2);
  return conn?.status === 'ACCEPTED';
}

export interface ConnectionWithId extends ConnectionDoc {
  id: string;
}

export async function listPendingConnectionsFor(
  uid: string
): Promise<ConnectionWithId[]> {
  try {
    const col = collection(db, COLLECTION);
    const qA = query(
      col,
      where('userA', '==', uid),
      where('status', '==', 'PENDING')
    );
    const qB = query(
      col,
      where('userB', '==', uid),
      where('status', '==', 'PENDING')
    );

    const [sa, sb] = await Promise.all([getDocs(qA), getDocs(qB)]);
    const map = new Map<string, ConnectionWithId>();
    sa.forEach((d) =>
      map.set(d.id, { id: d.id, ...(d.data() as ConnectionDoc) })
    );
    sb.forEach((d) =>
      map.set(d.id, { id: d.id, ...(d.data() as ConnectionDoc) })
    );
    return Array.from(map.values());
  } catch (error) {
    const err = error as FirebaseError;
    if (err?.code === 'permission-denied') {
      // If rules restrict listing, return empty silently
      Logger.debug(
        'listPendingConnectionsFor: permission denied (returning empty)',
        null,
        '🤝 Connections'
      );
      return [];
    }
    Logger.error('listPendingConnectionsFor error', error, '🤝 Connections');
    return [];
  }
}

// List accepted (friends) connections for a user
export async function listAcceptedConnectionsFor(
  uid: string
): Promise<ConnectionWithId[]> {
  try {
    const col = collection(db, COLLECTION);
    const qA = query(
      col,
      where('userA', '==', uid),
      where('status', '==', 'ACCEPTED')
    );
    const qB = query(
      col,
      where('userB', '==', uid),
      where('status', '==', 'ACCEPTED')
    );

    const [sa, sb] = await Promise.all([getDocs(qA), getDocs(qB)]);
    const map = new Map<string, ConnectionWithId>();
    sa.forEach((d) =>
      map.set(d.id, { id: d.id, ...(d.data() as ConnectionDoc) })
    );
    sb.forEach((d) =>
      map.set(d.id, { id: d.id, ...(d.data() as ConnectionDoc) })
    );
    return Array.from(map.values());
  } catch (error) {
    const err = error as FirebaseError;
    if (err?.code === 'permission-denied') {
      Logger.debug(
        'listAcceptedConnectionsFor: permission denied (returning empty)',
        null,
        '🤝 Connections'
      );
      return [];
    }
    Logger.error('listAcceptedConnectionsFor error', error, '🤝 Connections');
    return [];
  }
}

export async function requestFriendship(
  fromUid: string,
  toUid: string
): Promise<{ success: boolean; message?: string }> {
  if (!fromUid || !toUid || fromUid === toUid) {
    return { success: false, message: 'Invalid users' };
  }
  try {
    const id = pairKey(fromUid, toUid);
    const ref = doc(db, COLLECTION, id);
    const payload: ConnectionDoc = {
      userA: id.split('_')[0],
      userB: id.split('_')[1],
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      requestedBy: fromUid
    };
    await setDoc(ref, payload, { merge: true });
    return { success: true };
  } catch (error) {
    const err = error as FirebaseError;
    if (err?.code === 'permission-denied') {
      Logger.warn(
        'requestFriendship permission denied by rules',
        error,
        '🤝 Connections'
      );
      return { success: false, message: 'Not allowed by security rules' };
    }
    Logger.error('requestFriendship error', error, '🤝 Connections');
    return { success: false, message: 'Failed to request friendship' };
  }
}

export async function acceptFriendship(
  uid1: string,
  uid2: string,
  responderUid: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const id = pairKey(uid1, uid2);
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, {
      status: 'ACCEPTED',
      respondedBy: responderUid,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    const err = error as FirebaseError;
    if (err?.code === 'permission-denied') {
      Logger.warn(
        'acceptFriendship permission denied by rules',
        error,
        '🤝 Connections'
      );
      return { success: false, message: 'Not allowed by security rules' };
    }
    Logger.error('acceptFriendship error', error, '🤝 Connections');
    return { success: false, message: 'Failed to accept friendship' };
  }
}

export async function rejectFriendship(
  uid1: string,
  uid2: string,
  responderUid: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const id = pairKey(uid1, uid2);
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, {
      status: 'REJECTED',
      respondedBy: responderUid,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    const err = error as FirebaseError;
    if (err?.code === 'permission-denied') {
      Logger.warn(
        'rejectFriendship permission denied by rules',
        error,
        '🤝 Connections'
      );
      return { success: false, message: 'Not allowed by security rules' };
    }
    Logger.error('rejectFriendship error', error, '🤝 Connections');
    return { success: false, message: 'Failed to reject friendship' };
  }
}

export async function deleteFriendship(
  uid1: string,
  uid2: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const id = pairKey(uid1, uid2);
    const ref = doc(db, COLLECTION, id);
    await deleteDoc(ref);
    return { success: true };
  } catch (error) {
    const err = error as FirebaseError;
    if (err?.code === 'permission-denied') {
      Logger.warn(
        'deleteFriendship permission denied by rules',
        error,
        '🤝 Connections'
      );
      return { success: false, message: 'Not allowed by security rules' };
    }
    Logger.error('deleteFriendship error', error, '🤝 Connections');
    return { success: false, message: 'Failed to remove friend' };
  }
}

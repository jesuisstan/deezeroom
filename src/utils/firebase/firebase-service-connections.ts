import { FirebaseError } from 'firebase/app';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

import { Logger } from '@/components/modules/logger/LoggerModule';
import { db } from '@/utils/firebase/firebase-init';
import { getUserPushTokens } from '@/utils/firebase/firebase-service-notifications';
import {
  getPublicProfileDoc,
  type PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';
import { sendPushNotification } from '@/utils/send-push-notification';

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

const FRIEND_REQUEST_PUSH_TYPE = 'friend_request';

const FALLBACK_NAME = 'Someone';

const getUserDocSafe = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() : null;
  } catch (error) {
    const firebaseError = error as FirebaseError;
    if (firebaseError?.code !== 'permission-denied') {
      Logger.warn('getUserDocSafe error', error, '🤝 Connections');
    }
    return null;
  }
};

const resolveDisplayName = (
  publicProfile: PublicProfileDoc | null,
  userData: any,
  uid: string
) =>
  publicProfile?.displayName ||
  userData?.displayName ||
  userData?.email?.split?.('@')?.[0] ||
  uid?.slice(0, 6) ||
  FALLBACK_NAME;

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

export function subscribeToPendingConnections(
  uid: string,
  callback: (connections: ConnectionWithId[]) => void
): () => void {
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

  let mapA = new Map<string, ConnectionWithId>();
  let mapB = new Map<string, ConnectionWithId>();

  const emit = () => {
    const combined = new Map<string, ConnectionWithId>([...mapA, ...mapB]);
    callback(Array.from(combined.values()));
  };

  const unsubA = onSnapshot(
    qA,
    (snapshot) => {
      mapA = new Map(
        snapshot.docs.map((docSnap) => [
          docSnap.id,
          { id: docSnap.id, ...(docSnap.data() as ConnectionDoc) }
        ])
      );
      emit();
    },
    (error) => {
      Logger.warn(
        'subscribeToPendingConnections (userA) error',
        error,
        '🤝 Connections'
      );
    }
  );

  const unsubB = onSnapshot(
    qB,
    (snapshot) => {
      mapB = new Map(
        snapshot.docs.map((docSnap) => [
          docSnap.id,
          { id: docSnap.id, ...(docSnap.data() as ConnectionDoc) }
        ])
      );
      emit();
    },
    (error) => {
      Logger.warn(
        'subscribeToPendingConnections (userB) error',
        error,
        '🤝 Connections'
      );
    }
  );

  return () => {
    unsubA();
    unsubB();
  };
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

    // Send push notification to the recipient
    try {
      const [targetTokens, requesterPublicProfile, requesterDoc] =
        await Promise.all([
          getUserPushTokens(toUid),
          getPublicProfileDoc(fromUid),
          getUserDocSafe(fromUid)
        ]);

      const requesterName = resolveDisplayName(
        requesterPublicProfile,
        requesterDoc,
        fromUid
      );

      const uniqueTokens = new Set<string>();
      await Promise.allSettled(
        (targetTokens ?? [])
          .map((token) => token.expoPushToken)
          .filter((token): token is string => Boolean(token))
          .filter((token) => {
            if (uniqueTokens.has(token)) return false;
            uniqueTokens.add(token);
            return true;
          })
          .map((expoToken) =>
            sendPushNotification({
              to: expoToken,
              title: 'New friend request',
              body: `${requesterName} sent you a friend request`,
              data: {
                type: FRIEND_REQUEST_PUSH_TYPE,
                fromUid,
                toUid
              },
              badge: 1
            })
          )
      );
    } catch (notificationError) {
      Logger.warn(
        'Failed to send friend request push notification',
        notificationError,
        '🤝 Connections'
      );
    }

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

    const userRef1 = doc(db, 'users', uid1);
    const userRef2 = doc(db, 'users', uid2);

    await Promise.all([
      updateDoc(userRef1, {
        friendIds: arrayUnion(uid2),
        updatedAt: serverTimestamp()
      }),
      updateDoc(userRef2, {
        friendIds: arrayUnion(uid1),
        updatedAt: serverTimestamp()
      })
    ]);

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
    await deleteDoc(ref);
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
    const userRef1 = doc(db, 'users', uid1);
    const userRef2 = doc(db, 'users', uid2);

    await Promise.all([
      deleteDoc(ref),
      updateDoc(userRef1, {
        friendIds: arrayRemove(uid2),
        updatedAt: serverTimestamp()
      }),
      updateDoc(userRef2, {
        friendIds: arrayRemove(uid1),
        updatedAt: serverTimestamp()
      })
    ]);
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

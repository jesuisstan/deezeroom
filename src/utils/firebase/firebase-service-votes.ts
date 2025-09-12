import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';

import { db } from '@/utils/firebase/firebase-init';

export interface Vote {
  id: string;
  trackId: string;
  userId: string;
  playlistId: string;
  voteType: 'up' | 'down';
  createdAt: any;
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

import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

import { Logger } from '@/components/modules/logger';
import { Track } from '@/graphql/schema';
import { db } from '@/utils/firebase/firebase-init';

export type EventVisibility = 'public' | 'private';
export type EventVoteLicense = 'everyone' | 'invited' | 'geofence';
export type EventStatus = 'draft' | 'live' | 'ended';

export interface EventGeoFence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface EventTimeWindow {
  startAt?: Date;
  endAt?: Date;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  visibility: EventVisibility;
  voteLicense: EventVoteLicense;
  geofence?: EventGeoFence;
  voteTimeWindow?: EventTimeWindow;
  createdBy: string;
  createdAt: Timestamp | Date | null;
  updatedAt: Timestamp | Date | null;
  startAt?: Timestamp | Date | null;
  endAt?: Timestamp | Date | null;
  status: EventStatus;
  participantIds: string[];
  editorIds: string[];
  pendingInviteIds?: string[];
  trackCount: number;
}

export interface EventTrack {
  id: string;
  trackId: string;
  track: Track;
  addedBy: string;
  addedAt: Date;
  updatedAt?: Date;
  voteCount: number;
}

interface EventTrackDoc {
  trackId: string;
  track: Track;
  addedBy: string;
  addedAt: Timestamp;
  updatedAt?: Timestamp;
  voteCount: number;
}

interface EventVoteDoc {
  trackVotes: Record<string, boolean>;
  updatedAt: Timestamp;
}

export class EventService {
  private static collection = 'events';
  private static tracksCollection = 'tracks';
  private static votesCollection = 'votes';
  private static invitationsCollection = 'invitations';

  // ===== EVENTS CRUD =====

  static async createEvent(
    data: {
      name: string;
      description?: string;
      coverImageUrl?: string;
      visibility?: EventVisibility;
      voteLicense?: EventVoteLicense;
      geofence?: EventGeoFence;
      voteTimeWindow?: EventTimeWindow;
      startAt?: Date | null;
      endAt?: Date | null;
    },
    createdBy: string,
    initialTracks: Track[] = []
  ): Promise<string> {
    const eventData = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      coverImageUrl: data.coverImageUrl || null,
      visibility: data.visibility || 'public',
      voteLicense: data.voteLicense || 'everyone',
      geofence: data.geofence || null,
      voteTimeWindow: data.voteTimeWindow || null,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      startAt: data.startAt ? Timestamp.fromDate(data.startAt) : null,
      endAt: data.endAt ? Timestamp.fromDate(data.endAt) : null,
      status: 'live' as EventStatus,
      participantIds: [createdBy],
      editorIds: [createdBy],
      pendingInviteIds: [],
      trackCount: 0
    };

    const docRef = await addDoc(collection(db, this.collection), eventData);
    const eventId = docRef.id;

    if (initialTracks.length > 0) {
      const batchWrites = initialTracks.map((track) =>
        this.addTrackToEvent(eventId, track, createdBy, { autoVote: false })
      );
      await Promise.all(batchWrites);
    }

    return eventId;
  }

  static async getEvent(id: string): Promise<Event | null> {
    const eventRef = doc(db, this.collection, id);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      return null;
    }
    return { id: snap.id, ...snap.data() } as Event;
  }

  static subscribeToEvent(
    id: string,
    callback: (event: Event | null) => void
  ): () => void {
    const eventRef = doc(db, this.collection, id);
    return onSnapshot(eventRef, (docSnap) => {
      if (!docSnap.exists()) {
        callback(null);
        return;
      }
      callback({ id: docSnap.id, ...docSnap.data() } as Event);
    });
  }

  static subscribeToEventTracks(
    eventId: string,
    callback: (tracks: EventTrack[]) => void
  ): () => void {
    const tracksRef = collection(
      db,
      this.collection,
      eventId,
      this.tracksCollection
    );
    return onSnapshot(tracksRef, (querySnapshot) => {
      const tracks: EventTrack[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as EventTrackDoc;
        return {
          id: docSnap.id,
          trackId: data.trackId,
          track: data.track,
          voteCount: data.voteCount || 0,
          addedBy: data.addedBy,
          addedAt: data.addedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate()
        };
      });
      tracks.sort((a, b) => {
        if (b.voteCount !== a.voteCount) {
          return b.voteCount - a.voteCount;
        }
        return a.addedAt.getTime() - b.addedAt.getTime();
      });
      callback(tracks);
    });
  }

  static subscribeToUserVotes(
    eventId: string,
    userId: string,
    callback: (trackVotes: Record<string, boolean>) => void
  ): () => void {
    const voteRef = doc(
      db,
      this.collection,
      eventId,
      this.votesCollection,
      userId
    );
    return onSnapshot(voteRef, (docSnap) => {
      if (!docSnap.exists()) {
        callback({});
        return;
      }
      const data = docSnap.data() as EventVoteDoc | undefined;
      callback(data?.trackVotes ?? {});
    });
  }

  static async getPublicEvents(limitCount: number = 50): Promise<Event[]> {
    const eventsRef = collection(db, this.collection);
    const q = query(
      eventsRef,
      where('visibility', '==', 'public'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Event[];
    return events.sort((a, b) => {
      const dateA = this.toMillis(a.updatedAt);
      const dateB = this.toMillis(b.updatedAt);
      return dateB - dateA;
    });
  }

  static async getUserEvents(userId: string): Promise<Event[]> {
    const eventsRef = collection(db, this.collection);
    const q = query(eventsRef, where('createdBy', '==', userId));
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Event[];
    return events.sort((a, b) => {
      const dateA = (a.updatedAt as Timestamp | Date | null) ?? null;
      const dateB = (b.updatedAt as Timestamp | Date | null) ?? null;
      return (
        (dateB ? new Date(dateB as any).getTime() : 0) -
        (dateA ? new Date(dateA as any).getTime() : 0)
      );
    });
  }

  static async getUserParticipatingEvents(userId: string): Promise<Event[]> {
    const eventsRef = collection(db, this.collection);
    const q = query(
      eventsRef,
      where('participantIds', 'array-contains', userId)
    );
    const snapshot = await getDocs(q);
    const events = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Event)
      .filter((event) => event.createdBy !== userId);
    return events.sort((a, b) => {
      const dateA = (a.updatedAt as Timestamp | Date | null) ?? null;
      const dateB = (b.updatedAt as Timestamp | Date | null) ?? null;
      return (
        (dateB ? new Date(dateB as any).getTime() : 0) -
        (dateA ? new Date(dateA as any).getTime() : 0)
      );
    });
  }

  static subscribeToUserEvents(
    userId: string,
    callback: (events: Event[]) => void
  ): () => void {
    const eventsRef = collection(db, this.collection);
    const q = query(eventsRef, where('createdBy', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as Event[];
      events.sort((a, b) => {
        const dateA = (a.updatedAt as Timestamp | Date | null) ?? null;
        const dateB = (b.updatedAt as Timestamp | Date | null) ?? null;
        return (
          (dateB ? new Date(dateB as any).getTime() : 0) -
          (dateA ? new Date(dateA as any).getTime() : 0)
        );
      });
      callback(events);
    });
  }

  static subscribeToUserParticipatingEvents(
    userId: string,
    callback: (events: Event[]) => void
  ): () => void {
    const eventsRef = collection(db, this.collection);
    const q = query(
      eventsRef,
      where('participantIds', 'array-contains', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Event)
        .filter((event) => event.createdBy !== userId);
      events.sort((a, b) => {
        const dateA = (a.updatedAt as Timestamp | Date | null) ?? null;
        const dateB = (b.updatedAt as Timestamp | Date | null) ?? null;
        return (
          (dateB ? new Date(dateB as any).getTime() : 0) -
          (dateA ? new Date(dateA as any).getTime() : 0)
        );
      });
      callback(events);
    });
  }

  static subscribeToPublicEvents(
    callback: (events: Event[]) => void,
    limitCount: number = 50
  ): () => void {
    const eventsRef = collection(db, this.collection);
    const q = query(
      eventsRef,
      where('visibility', '==', 'public'),
      limit(limitCount)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const events = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Event[];
        events.sort(
          (a, b) => this.toMillis(b.updatedAt) - this.toMillis(a.updatedAt)
        );
        callback(events);
      },
      (error) => {
        Logger.error('Error in subscribeToPublicEvents:', error);
      }
    );
  }

  // ===== TRACK MANAGEMENT =====

  static async addTrackToEvent(
    eventId: string,
    track: Track,
    userId: string,
    options: { autoVote?: boolean } = { autoVote: true }
  ): Promise<void> {
    const { autoVote = true } = options;
    const eventRef = doc(db, this.collection, eventId);
    const trackRef = doc(
      db,
      this.collection,
      eventId,
      this.tracksCollection,
      track.id
    );
    const voteRef = doc(
      db,
      this.collection,
      eventId,
      this.votesCollection,
      userId
    );

    await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }
      const event = eventSnap.data() as Event;

      if (!this.canUserAddTrack(event, userId)) {
        throw new Error(
          'You do not have permission to add tracks to this event'
        );
      }

      const trackSnap = await transaction.get(trackRef);
      const voteSnap = await transaction.get(voteRef);
      const trackVotes =
        (voteSnap.exists()
          ? (voteSnap.data() as EventVoteDoc).trackVotes
          : {}) || {};

      if (trackSnap.exists()) {
        if (autoVote) {
          if (trackVotes[track.id]) {
            throw new Error('You already voted for this track');
          }

          const trackData = trackSnap.data() as EventTrackDoc;
          transaction.update(trackRef, {
            voteCount: (trackData.voteCount || 0) + 1,
            updatedAt: serverTimestamp()
          });
          trackVotes[track.id] = true;
        } else {
          // Nothing to do, track already exists
          return;
        }
      } else {
        transaction.set(trackRef, {
          trackId: track.id,
          track,
          addedBy: userId,
          addedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          voteCount: autoVote ? 1 : 0
        });
        transaction.update(eventRef, {
          trackCount: increment(1),
          updatedAt: serverTimestamp()
        });
        if (autoVote) {
          trackVotes[track.id] = true;
        }
      }

      if (autoVote) {
        transaction.set(
          voteRef,
          {
            trackVotes: {
              ...trackVotes
            },
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }
    });
  }

  static async voteForTrack(
    eventId: string,
    trackId: string,
    userId: string
  ): Promise<void> {
    const eventRef = doc(db, this.collection, eventId);
    const trackRef = doc(
      db,
      this.collection,
      eventId,
      this.tracksCollection,
      trackId
    );
    const voteRef = doc(
      db,
      this.collection,
      eventId,
      this.votesCollection,
      userId
    );

    await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }
      const event = eventSnap.data() as Event;

      if (!this.canUserVoteWithEvent(event, userId)) {
        throw new Error('You do not have permission to vote in this event');
      }

      const trackSnap = await transaction.get(trackRef);
      if (!trackSnap.exists()) {
        throw new Error('Track not found in this event');
      }

      const voteSnap = await transaction.get(voteRef);
      const trackVotes =
        (voteSnap.exists()
          ? (voteSnap.data() as EventVoteDoc).trackVotes
          : {}) || {};

      if (trackVotes[trackId]) {
        throw new Error('You have already voted for this track');
      }

      const trackData = trackSnap.data() as EventTrackDoc;
      transaction.update(trackRef, {
        voteCount: (trackData.voteCount || 0) + 1,
        updatedAt: serverTimestamp()
      });

      trackVotes[trackId] = true;
      transaction.set(
        voteRef,
        {
          trackVotes,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });
  }

  static async removeVoteFromTrack(
    eventId: string,
    trackId: string,
    userId: string
  ): Promise<void> {
    const eventRef = doc(db, this.collection, eventId);
    const trackRef = doc(
      db,
      this.collection,
      eventId,
      this.tracksCollection,
      trackId
    );
    const voteRef = doc(
      db,
      this.collection,
      eventId,
      this.votesCollection,
      userId
    );

    await runTransaction(db, async (transaction) => {
      const trackSnap = await transaction.get(trackRef);
      if (!trackSnap.exists()) {
        throw new Error('Track not found');
      }

      const trackData = trackSnap.data() as EventTrackDoc;

      const voteSnap = await transaction.get(voteRef);
      if (!voteSnap.exists()) {
        throw new Error('No votes to remove');
      }
      const voteData = voteSnap.data() as EventVoteDoc;
      const trackVotes = voteData.trackVotes || {};

      if (!trackVotes[trackId]) {
        throw new Error('You have not voted for this track');
      }

      const updatedVotes = { ...trackVotes };
      delete updatedVotes[trackId];

      transaction.update(trackRef, {
        voteCount: Math.max((trackData.voteCount || 0) - 1, 0),
        updatedAt: serverTimestamp()
      });

      transaction.set(
        voteRef,
        {
          trackVotes: updatedVotes,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });
  }

  static async removeTrackFromEvent(
    eventId: string,
    trackId: string,
    userId: string
  ): Promise<void> {
    const eventRef = doc(db, this.collection, eventId);
    const trackRef = doc(
      db,
      this.collection,
      eventId,
      this.tracksCollection,
      trackId
    );

    await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }
      const event = eventSnap.data() as Event;

      if (!this.canUserManageEvent(event, userId)) {
        throw new Error(
          'You do not have permission to remove tracks from this event'
        );
      }

      const trackSnap = await transaction.get(trackRef);
      if (!trackSnap.exists()) {
        return;
      }

      transaction.delete(trackRef);
      transaction.update(eventRef, {
        trackCount: increment(-1),
        updatedAt: serverTimestamp()
      });
    });
  }

  static async deleteEvent(eventId: string): Promise<void> {
    const eventRef = doc(db, this.collection, eventId);
    const tracksSnapshot = await getDocs(
      collection(eventRef, this.tracksCollection)
    );
    const votesSnapshot = await getDocs(
      collection(eventRef, this.votesCollection)
    );
    const invitationsSnapshot = await getDocs(
      collection(eventRef, this.invitationsCollection)
    );

    const batchDeletes: Promise<void>[] = [];

    tracksSnapshot.docs.forEach((docSnap) => {
      batchDeletes.push(deleteDoc(docSnap.ref));
    });

    votesSnapshot.docs.forEach((docSnap) => {
      batchDeletes.push(deleteDoc(docSnap.ref));
    });

    invitationsSnapshot.docs.forEach((docSnap) => {
      batchDeletes.push(deleteDoc(docSnap.ref));
    });

    await Promise.all(batchDeletes);
    await deleteDoc(eventRef);
  }

  // ===== PERMISSIONS =====

  static canUserManageEvent(event: Event, userId: string): boolean {
    if (event.createdBy === userId) {
      return true;
    }
    return event.editorIds?.includes(userId) ?? false;
  }

  static canUserAddTrack(event: Event, userId: string): boolean {
    if (event.visibility === 'private') {
      return event.participantIds?.includes(userId) ?? false;
    }

    if (event.voteLicense === 'invited') {
      return event.participantIds?.includes(userId) ?? false;
    }

    return true;
  }

  static canUserVoteWithEvent(event: Event, userId: string): boolean {
    if (event.visibility === 'private') {
      return event.participantIds?.includes(userId) ?? false;
    }

    switch (event.voteLicense) {
      case 'everyone':
        return true;
      case 'invited':
        return event.participantIds?.includes(userId) ?? false;
      case 'geofence':
        // For version 1 require participant status (can extend with geo/time checks later)
        return event.participantIds?.includes(userId) ?? false;
      default:
        return false;
    }
  }

  static async canUserVote(eventId: string, userId: string): Promise<boolean> {
    const event = await this.getEvent(eventId);
    if (!event) return false;
    return this.canUserVoteWithEvent(event, userId);
  }

  // ===== INVITATIONS =====

  static async inviteUserToEvent(
    eventId: string,
    userId: string,
    invitedBy: string,
    displayName?: string,
    email?: string
  ): Promise<string> {
    const event = await this.getEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    if (!this.canUserManageEvent(event, invitedBy)) {
      throw new Error(
        'You do not have permission to invite users to this event'
      );
    }

    const invitationData = {
      userId,
      invitedBy,
      invitedAt: new Date(),
      status: 'pending' as const,
      displayName,
      email,
      eventName: event.name
    };

    const invitationRef = await addDoc(
      collection(db, this.collection, eventId, this.invitationsCollection),
      invitationData
    );

    await updateDoc(doc(db, this.collection, eventId), {
      pendingInviteIds: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });

    return invitationRef.id;
  }

  static async acceptInvitation(
    eventId: string,
    invitationId: string,
    userId: string
  ): Promise<void> {
    const invitationRef = doc(
      db,
      this.collection,
      eventId,
      this.invitationsCollection,
      invitationId
    );

    await runTransaction(db, async (transaction) => {
      const invitationSnap = await transaction.get(invitationRef);
      if (!invitationSnap.exists()) {
        throw new Error('Invitation not found');
      }

      const eventRef = doc(db, this.collection, eventId);
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }
      const event = eventSnap.data() as Event;

      if ((event.participantIds || []).includes(userId)) {
        throw new Error('You are already a participant in this event');
      }

      const updatedParticipants = [...(event.participantIds || []), userId];
      const updatedPending = (event.pendingInviteIds || []).filter(
        (id) => id !== userId
      );

      transaction.update(eventRef, {
        participantIds: updatedParticipants,
        pendingInviteIds: updatedPending,
        updatedAt: serverTimestamp()
      });

      transaction.delete(invitationRef);
    });
  }

  static async declineInvitation(
    eventId: string,
    invitationId: string,
    userId: string
  ): Promise<void> {
    const invitationRef = doc(
      db,
      this.collection,
      eventId,
      this.invitationsCollection,
      invitationId
    );

    await runTransaction(db, async (transaction) => {
      const invitationSnap = await transaction.get(invitationRef);
      if (!invitationSnap.exists()) {
        return;
      }

      const eventRef = doc(db, this.collection, eventId);
      const eventSnap = await transaction.get(eventRef);
      if (eventSnap.exists()) {
        const event = eventSnap.data() as Event;
        const updatedPending = (event.pendingInviteIds || []).filter(
          (id) => id !== userId
        );
        transaction.update(eventRef, {
          pendingInviteIds: updatedPending,
          updatedAt: serverTimestamp()
        });
      }

      transaction.delete(invitationRef);
    });
  }

  private static toMillis(value: Timestamp | Date | null | undefined): number {
    if (!value) return 0;
    if (value instanceof Timestamp) {
      return value.toMillis();
    }
    return new Date(value).getTime();
  }
}

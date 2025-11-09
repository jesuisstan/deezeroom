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
  ownerDisplayName?: string | null;
  timezone?: string | null;
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
      startAt: Date;
      endAt: Date;
      timezone?: string | null;
    },
    createdBy: string,
    initialTracks: Track[] = [],
    ownerInfo?: { displayName?: string | null }
  ): Promise<string> {
    const now = new Date();
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    if (startAt < now) {
      throw new Error('Event start time must be in the future');
    }
    if (endAt <= startAt) {
      throw new Error('Event end time must be after start time');
    }

    const status = this.computeStatus(startAt, endAt);
    const eventData = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      coverImageUrl: data.coverImageUrl || null,
      visibility: data.visibility || 'public',
      voteLicense: data.voteLicense || 'everyone',
      geofence: data.geofence || null,
      voteTimeWindow: data.voteTimeWindow || null,
      createdBy,
      ownerDisplayName: ownerInfo?.displayName ?? null,
      timezone: data.timezone || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      startAt: Timestamp.fromDate(startAt),
      endAt: Timestamp.fromDate(endAt),
      status,
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
    return this.deserializeEventDoc(snap.id, snap.data());
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
      callback(this.deserializeEventDoc(docSnap.id, docSnap.data()));
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
    const events = snapshot.docs.map((docSnap) =>
      this.deserializeEventDoc(docSnap.id, docSnap.data())
    );
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
    const events = snapshot.docs.map((docSnap) =>
      this.deserializeEventDoc(docSnap.id, docSnap.data())
    );
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
      .map((docSnap) => this.deserializeEventDoc(docSnap.id, docSnap.data()))
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
      const events = snapshot.docs.map((docSnap) =>
        this.deserializeEventDoc(docSnap.id, docSnap.data())
      );
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

  static async getPassedEvents(userId: string | null): Promise<Event[]> {
    const [owned, participating, publicEvents] = await Promise.all([
      userId ? this.getUserEvents(userId) : Promise.resolve([]),
      userId ? this.getUserParticipatingEvents(userId) : Promise.resolve([]),
      this.getPublicEvents()
    ]);

    const map = new Map<string, Event>();
    [...owned, ...participating, ...publicEvents].forEach((event) => {
      if (!this.hasEventEnded(event)) {
        return;
      }
      map.set(event.id, event);
    });

    return Array.from(map.values()).sort((a, b) => {
      const endA = this.toMillis(a.endAt);
      const endB = this.toMillis(b.endAt);
      return endB - endA;
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
        .map((docSnap) => this.deserializeEventDoc(docSnap.id, docSnap.data()))
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
        const events = snapshot.docs.map((docSnap) =>
          this.deserializeEventDoc(docSnap.id, docSnap.data())
        );
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
      const event = this.deserializeEventDoc(eventSnap.id, eventSnap.data());

      if (this.hasEventEnded(event)) {
        throw new Error('Event has already ended');
      }

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
      const event = this.deserializeEventDoc(eventSnap.id, eventSnap.data());

      if (this.hasEventEnded(event)) {
        throw new Error('Event has already ended');
      }

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
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }
      const event = this.deserializeEventDoc(eventSnap.id, eventSnap.data());

      if (this.hasEventEnded(event)) {
        throw new Error('Event has already ended');
      }

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
      const event = this.deserializeEventDoc(eventSnap.id, eventSnap.data());

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
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      return;
    }
    const event = this.deserializeEventDoc(eventSnap.id, eventSnap.data());
    if (this.hasEventEnded(event)) {
      throw new Error('Ended events cannot be deleted');
    }
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
    if (this.hasEventEnded(event)) {
      return false;
    }
    if (event.createdBy === userId) {
      return true;
    }
    return event.editorIds?.includes(userId) ?? false;
  }

  static canUserAddTrack(event: Event, userId: string): boolean {
    if (this.hasEventEnded(event)) {
      return false;
    }
    if (event.visibility === 'private') {
      return event.participantIds?.includes(userId) ?? false;
    }

    if (event.voteLicense === 'invited') {
      return event.participantIds?.includes(userId) ?? false;
    }

    return true;
  }

  static canUserVoteWithEvent(event: Event, userId: string): boolean {
    if (this.hasEventEnded(event)) {
      return false;
    }
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
    if (!this.isEventActive(event)) {
      throw new Error('Cannot invite users to an event that has ended');
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
      const event = this.deserializeEventDoc(eventSnap.id, eventSnap.data());

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
        const event = this.deserializeEventDoc(eventSnap.id, eventSnap.data());
        if (this.hasEventEnded(event)) {
          throw new Error('Event has already ended');
        }
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

  static toDate(value: Timestamp | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    return new Date(value);
  }

  static toMillis(value: Timestamp | Date | null | undefined): number {
    if (!value) return 0;
    if (value instanceof Timestamp) {
      return value.toMillis();
    }
    return new Date(value).getTime();
  }

  private static computeStatus(startAt: Date, endAt: Date): EventStatus {
    const now = Date.now();
    if (endAt.getTime() <= now) {
      return 'ended';
    }
    if (startAt.getTime() > now) {
      return 'draft';
    }
    return 'live';
  }

  static hasEventEnded(event: Event): boolean {
    const end = this.toDate(event.endAt);
    if (!end) return false;
    return end.getTime() <= Date.now();
  }

  static hasEventStarted(event: Event): boolean {
    const start = this.toDate(event.startAt);
    if (!start) return false;
    return start.getTime() <= Date.now();
  }

  static isEventActive(event: Event): boolean {
    return !this.hasEventEnded(event);
  }

  private static deserializeEventDoc(id: string, data: any): Event {
    const startAt = this.toDate(data?.startAt) ?? null;
    const endAt = this.toDate(data?.endAt) ?? null;
    const status =
      startAt && endAt ? this.computeStatus(startAt, endAt) : 'draft';

    return {
      id,
      name: data?.name ?? '',
      description: data?.description ?? undefined,
      coverImageUrl: data?.coverImageUrl ?? undefined,
      visibility: data?.visibility ?? 'public',
      voteLicense: data?.voteLicense ?? 'everyone',
      geofence: data?.geofence ?? undefined,
      voteTimeWindow: data?.voteTimeWindow ?? undefined,
      createdBy: data?.createdBy ?? '',
      ownerDisplayName: data?.ownerDisplayName ?? null,
      timezone: data?.timezone ?? null,
      createdAt: this.toDate(data?.createdAt),
      updatedAt: this.toDate(data?.updatedAt),
      startAt,
      endAt,
      status,
      participantIds: Array.isArray(data?.participantIds)
        ? data.participantIds
        : [],
      editorIds: Array.isArray(data?.editorIds) ? data.editorIds : [],
      pendingInviteIds: Array.isArray(data?.pendingInviteIds)
        ? data.pendingInviteIds
        : [],
      trackCount: data?.trackCount ?? 0
    } as Event;
  }
}

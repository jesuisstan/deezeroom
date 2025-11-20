import {
  addDoc,
  arrayUnion,
  collection,
  collectionGroup,
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
import { getUserPushTokens } from '@/utils/firebase/firebase-service-notifications';
import {
  getPublicProfileDoc,
  type PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';
import { parseFirestoreDate } from '@/utils/firebase/firestore-date-utils';
import { sendPushNotification } from '@/utils/send-push-notification';

export type EventVisibility = 'public' | 'private';
export type EventVoteLicense = 'everyone' | 'invited';
export type EventStatus = 'draft' | 'live' | 'ended';

export interface EventGeoFence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string;
}

export interface EventTimeWindow {
  startAt?: Date;
  endAt?: Date;
}

export interface CurrentlyPlayingTrack {
  trackId: string;
  title: string;
  artist: string;
  albumCover?: string;
  duration: number;
  explicitLyrics?: boolean;
}

export interface PlayedTrack {
  trackId: string;
  title: string;
  artist: string;
  albumCover?: string;
  duration: number;
  playedAt: Date | any; // Firestore Timestamp
  voteCount: number;
  skipped: boolean;
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
  hostIds: string[];
  timezone?: string | null;
  createdAt: Timestamp | Date | null;
  updatedAt: Timestamp | Date | null;
  startAt?: Timestamp | Date | null;
  endAt?: Timestamp | Date | null;
  status: EventStatus;
  participantIds: string[];
  pendingInviteIds?: string[];
  trackCount: number;
  
  // Playback state
  currentlyPlayingTrack?: CurrentlyPlayingTrack | null;
  isPlaying: boolean;
  playedTracks?: PlayedTrack[];
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

export interface EventInvitation {
  id: string;
  eventId: string;
  eventName?: string;
  userId: string;
  invitedBy: string;
  invitedAt: Date | any; // Can be Date or Firestore Timestamp
  status: 'pending';
}

const FALLBACK_DISPLAY_NAME = 'Someone';

const resolveDisplayName = (
  publicProfile: PublicProfileDoc | null,
  uid: string
) => publicProfile?.displayName || uid?.slice(0, 6) || FALLBACK_DISPLAY_NAME;

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
  private static invitationsCollection = 'eventInvitations';

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
    initialTracks: Track[] = []
  ): Promise<string> {
    // Validate name
    if (!data.name || !data.name.trim()) {
      throw new Error('Event name is required');
    }

    // Validate geofence if provided
    if (data.geofence) {
      if (
        typeof data.geofence.latitude !== 'number' ||
        typeof data.geofence.longitude !== 'number' ||
        isNaN(data.geofence.latitude) ||
        isNaN(data.geofence.longitude)
      ) {
        throw new Error('Geofence must have valid latitude and longitude');
      }
      if (
        typeof data.geofence.radiusMeters !== 'number' ||
        isNaN(data.geofence.radiusMeters) ||
        data.geofence.radiusMeters <= 0
      ) {
        throw new Error('Geofence must have a valid radius greater than 0');
      }
    }

    const now = new Date();
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    // Allow 1 minute tolerance for slow users (e.g., if user sets 13:10:00 but creates event at 13:10:30)
    const TIME_TOLERANCE_MS = 60 * 1000; // 1 minute
    const minAllowedTime = new Date(now.getTime() - TIME_TOLERANCE_MS);
    if (startAt < minAllowedTime) {
      throw new Error(
        'Event start time must be in the future (within 1 minute tolerance)'
      );
    }
    if (endAt <= startAt) {
      throw new Error('Event end time must be after start time');
    }

    // Status will be computed automatically from startAt/endAt, no need to store it
    const eventData = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      coverImageUrl: data.coverImageUrl || null,
      visibility: data.visibility || 'public',
      voteLicense: data.voteLicense || 'everyone',
      geofence: data.geofence || null,
      voteTimeWindow: data.voteTimeWindow || null,
      hostIds: [createdBy],
      timezone: data.timezone || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      startAt: Timestamp.fromDate(startAt),
      endAt: Timestamp.fromDate(endAt),
      participantIds: [createdBy],
      pendingInviteIds: [],
      trackCount: 0,
      // Playback state
      currentlyPlayingTrack: null,
      isPlaying: false,
      playedTracks: []
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

  static async updateEvent(
    eventId: string,
    updates: {
      name?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
    }
  ): Promise<void> {
    const eventRef = doc(db, this.collection, eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const event = this.deserializeEventDoc(eventSnap.id, eventSnap.data());

    // Validate name if provided
    if (updates.name !== undefined) {
      if (!updates.name || !updates.name.trim()) {
        throw new Error('Event name is required');
      }
    }

    // Validate dates if provided
    const now = new Date();
    const currentStartAt = event.startAt
      ? new Date(event.startAt as any)
      : null;
    const currentEndAt = event.endAt ? new Date(event.endAt as any) : null;

    const newStartAt = updates.startAt
      ? new Date(updates.startAt)
      : currentStartAt;
    const newEndAt = updates.endAt ? new Date(updates.endAt) : currentEndAt;

    // If updating startAt, validate it
    if (updates.startAt !== undefined) {
      // Allow hosts to start event early (set startAt to current time or past)
      // But don't allow changing start time if event has already started naturally
      const hasStarted =
        currentStartAt && currentStartAt.getTime() <= now.getTime();
      if (
        hasStarted &&
        newStartAt &&
        newStartAt.getTime() !== currentStartAt.getTime()
      ) {
        throw new Error('Cannot change start time after event has started');
      }
      // Allow setting startAt to current time or past (early start)
      // But validate that it's not too far in the past (e.g., more than 1 hour)
      if (newStartAt && newStartAt.getTime() < now.getTime() - 60 * 60 * 1000) {
        throw new Error('Cannot set start time more than 1 hour in the past');
      }
    }

    // Validate endAt
    if (newStartAt && newEndAt) {
      if (newEndAt <= newStartAt) {
        throw new Error('Event end time must be after start time');
      }
      if (newEndAt < now) {
        throw new Error('Event end time must be in the future');
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description?.trim() || null;
    }

    if (updates.startAt !== undefined && newStartAt) {
      updateData.startAt = Timestamp.fromDate(newStartAt);
    }

    if (updates.endAt !== undefined && newEndAt) {
      updateData.endAt = Timestamp.fromDate(newEndAt);
    }

    await updateDoc(eventRef, updateData);
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
      // Sort by voteCount descending (most votes first), then by addedAt ascending (older first)
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
    return onSnapshot(
      voteRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          callback({});
          return;
        }
        const data = docSnap.data() as EventVoteDoc | undefined;
        callback(data?.trackVotes ?? {});
      },
      (error) => {
        Logger.error('Error in subscribeToUserVotes:', error);
        callback({});
      }
    );
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
    const q = query(eventsRef, where('hostIds', 'array-contains', userId));
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
      .filter((event) => !event.hostIds.includes(userId));
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
    const q = query(eventsRef, where('hostIds', 'array-contains', userId));
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
        .filter((event) => !event.hostIds.includes(userId));
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
    options: { autoVote?: boolean } = { autoVote: false }
  ): Promise<void> {
    const { autoVote = false } = options;
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

      // Allow toggle voting - if already voted, just return (no error)
      if (trackVotes[trackId]) {
        return;
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
      const trackVotes =
        (voteSnap.exists()
          ? (voteSnap.data() as EventVoteDoc).trackVotes
          : {}) || {};

      // Allow toggle - if not voted, just return (no error)
      if (!trackVotes[trackId]) {
        return;
      }

      const updatedVotes = { ...trackVotes };
      delete updatedVotes[trackId];

      transaction.update(trackRef, {
        voteCount: Math.max((trackData.voteCount || 0) - 1, 0),
        updatedAt: serverTimestamp()
      });

      // If no votes left, delete the vote document, otherwise update it
      if (Object.keys(updatedVotes).length === 0) {
        transaction.delete(voteRef);
      } else {
        transaction.set(
          voteRef,
          {
            trackVotes: updatedVotes,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }
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

      const trackSnap = await transaction.get(trackRef);
      if (!trackSnap.exists()) {
        return;
      }

      const trackData = trackSnap.data() as EventTrackDoc;

      // Only the user who added the track can remove it
      if (trackData.addedBy !== userId) {
        throw new Error('Only the user who added this track can remove it');
      }

      // Track can only be removed if it has no votes
      if ((trackData.voteCount || 0) > 0) {
        throw new Error('Cannot remove track that has votes');
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
    return event.hostIds?.includes(userId) ?? false;
  }

  static canUserAddTrack(event: Event, userId: string): boolean {
    if (this.hasEventEnded(event)) {
      return false;
    }

    // Private events: only participants can add tracks
    if (event.visibility === 'private') {
      return event.participantIds?.includes(userId) ?? false;
    }

    // Public + invited: only participants can add tracks
    if (event.voteLicense === 'invited') {
      return event.participantIds?.includes(userId) ?? false;
    }

    // Public + everyone: everyone can add tracks
    // (geofence check is handled on client side, but requires participant status for now)
    if (event.geofence) {
      return event.participantIds?.includes(userId) ?? false;
    }

    return true;
  }

  static canUserVoteWithEvent(event: Event, userId: string): boolean {
    if (this.hasEventEnded(event)) {
      return false;
    }

    // Private events: only participants can vote
    if (event.visibility === 'private') {
      return event.participantIds?.includes(userId) ?? false;
    }

    // Public + invited: only participants can vote
    if (event.voteLicense === 'invited') {
      return event.participantIds?.includes(userId) ?? false;
    }

    // Public + everyone: everyone can vote
    // (geofence check is handled on client side, but requires participant status for now)
    if (event.geofence) {
      return event.participantIds?.includes(userId) ?? false;
    }

    // Public + everyone: everyone can vote
    return true;
  }

  static async canUserVote(eventId: string, userId: string): Promise<boolean> {
    const event = await this.getEvent(eventId);
    if (!event) return false;
    return this.canUserVoteWithEvent(event, userId);
  }

  static async startEventEarly(eventId: string, userId: string): Promise<void> {
    const event = await this.getEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (!this.canUserManageEvent(event, userId)) {
      throw new Error('Only hosts can start events early');
    }

    if (this.hasEventStarted(event)) {
      throw new Error('Event has already started');
    }

    const eventRef = doc(db, this.collection, eventId);
    const endAt = event.endAt ? new Date(event.endAt as any) : null;

    if (!endAt) {
      throw new Error('Event end time is not set');
    }

    // Set startAt to current server time (exactly now, not earlier or later)
    // Use serverTimestamp() to ensure it's exactly the current server time
    await updateDoc(eventRef, {
      startAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  static async endEventEarly(eventId: string, userId: string): Promise<void> {
    const event = await this.getEvent(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (!this.canUserManageEvent(event, userId)) {
      throw new Error('Only hosts can end events early');
    }

    if (!this.hasEventStarted(event)) {
      throw new Error('Event has not started yet');
    }

    if (this.hasEventEnded(event)) {
      throw new Error('Event has already ended');
    }

    const eventRef = doc(db, this.collection, eventId);

    // Set endAt to current server time (exactly now, not earlier or later)
    // Use serverTimestamp() to ensure it's exactly the current server time
    // Status will be computed automatically from startAt/endAt, no need to store it
    await updateDoc(eventRef, {
      endAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // ===== INVITATIONS =====

  static async inviteUserToEvent(
    eventId: string,
    userId: string,
    invitedBy: string
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

    // Send push notification to invited user
    try {
      const [inviteeTokens, inviterPublicProfile] = await Promise.all([
        getUserPushTokens(userId),
        getPublicProfileDoc(invitedBy)
      ]);

      const inviterName = resolveDisplayName(inviterPublicProfile, invitedBy);

      const uniqueTokens = new Set<string>();
      await Promise.allSettled(
        (inviteeTokens ?? [])
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
              title: 'New Event Invitation',
              body: `${inviterName} invited you to "${event.name || 'an event'}"`,
              data: {
                type: 'event_invitation',
                eventId,
                invitationId: invitationRef.id,
                toUid: userId
              },
              badge: 1
            })
          )
      );

      if (uniqueTokens.size > 0) {
        Logger.info('Push notification sent to invited user');
      }
    } catch (error) {
      Logger.error('Error sending push notification:', error);
      // Don't throw - invitation is created, notification is optional
    }

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
        // Only update pendingInviteIds if event hasn't ended
        // If event has ended, just delete the invitation
        if (!this.hasEventEnded(event)) {
          const updatedPending = (event.pendingInviteIds || []).filter(
            (id) => id !== userId
          );
          transaction.update(eventRef, {
            pendingInviteIds: updatedPending,
            updatedAt: serverTimestamp()
          });
        }
      }

      transaction.delete(invitationRef);
    });
  }

  static async inviteMultipleUsersToEvent(
    eventId: string,
    users: { userId: string }[],
    invitedBy: string
  ): Promise<{ success: boolean; invitedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let invitedCount = 0;

    for (const user of users) {
      try {
        await this.inviteUserToEvent(eventId, user.userId, invitedBy);
        invitedCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${user.userId} - ${errorMessage}`);
        Logger.error('Error inviting user to event:', error);
      }
    }

    return {
      success: invitedCount > 0,
      invitedCount,
      errors
    };
  }

  static subscribeToUserEventInvitations(
    userId: string,
    callback: (invitations: EventInvitation[]) => void
  ): () => void {
    const invitationsQuery = query(
      collectionGroup(db, this.invitationsCollection),
      where('userId', '==', userId)
    );

    return onSnapshot(
      invitationsQuery,
      (querySnapshot) => {
        const invitations = querySnapshot.docs
          .map((invitationDoc) => {
            const parentEventId = invitationDoc.ref.parent.parent?.id;
            return {
              id: invitationDoc.id,
              eventId: parentEventId || '',
              ...invitationDoc.data()
            } as EventInvitation;
          })
          .filter((invitation) => invitation.status === 'pending');

        const sortedInvitations = invitations.sort((a, b) => {
          const dateA = parseFirestoreDate(a.invitedAt);
          const dateB = parseFirestoreDate(b.invitedAt);
          return dateB.getTime() - dateA.getTime();
        });

        callback(sortedInvitations);
      },
      (error) => {
        Logger.error(
          'Error in real-time event invitation subscriptions:',
          error
        );
      }
    );
  }

  static async getUserEventInvitations(
    userId: string
  ): Promise<EventInvitation[]> {
    const invitationsQuery = query(
      collectionGroup(db, this.invitationsCollection),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(invitationsQuery);
    const invitations = querySnapshot.docs
      .map((invitationDoc) => {
        const parentEventId = invitationDoc.ref.parent.parent?.id;
        return {
          id: invitationDoc.id,
          eventId: parentEventId || '',
          ...invitationDoc.data()
        } as EventInvitation;
      })
      .filter((invitation) => invitation.status === 'pending');

    return invitations.sort((a, b) => {
      const dateA = parseFirestoreDate(a.invitedAt);
      const dateB = parseFirestoreDate(b.invitedAt);
      return dateB.getTime() - dateA.getTime();
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

  /**
   * Compute event status from startAt and endAt timestamps
   * IMPORTANT: Uses exact timestamp comparison (to the millisecond, not rounded)
   * This ensures consistent status determination between Firebase Rules and frontend
   * Time must be precise to avoid incorrect live/draft/ended status in UI
   *
   * Status logic:
   * - 'ended': endAt <= now (event has finished)
   * - 'draft': startAt > now (event hasn't started yet, or missing dates)
   * - 'live': startAt <= now && endAt > now (event is currently running)
   */
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

  // IMPORTANT: Uses exact timestamp comparison (to the millisecond, not rounded)
  // This ensures consistent status determination between Firebase Rules and frontend
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

  /**
   * Get event status computed from startAt and endAt timestamps
   * Status is always computed on-the-fly, never stored in database
   *
   * Returns 'draft' if:
   * - Event has no startAt or endAt dates, OR
   * - Event's startAt is in the future (hasn't started yet)
   */
  static getStatus(event: Event): EventStatus {
    if (!event.startAt || !event.endAt) {
      return 'draft';
    }
    return this.computeStatus(
      new Date(event.startAt as any),
      new Date(event.endAt as any)
    );
  }

  private static deserializeEventDoc(id: string, data: any): Event {
    const startAt = this.toDate(data?.startAt) ?? null;
    const endAt = this.toDate(data?.endAt) ?? null;
    // Always compute status from startAt/endAt, never use status from database
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
      hostIds: Array.isArray(data?.hostIds)
        ? data.hostIds
        : Array.isArray(data?.createdBy)
          ? data.createdBy
          : data?.createdBy
            ? [data.createdBy]
            : [],
      timezone: data?.timezone ?? null,
      createdAt: this.toDate(data?.createdAt),
      updatedAt: this.toDate(data?.updatedAt),
      startAt,
      endAt,
      status,
      participantIds: Array.isArray(data?.participantIds)
        ? data.participantIds
        : [],
      pendingInviteIds: Array.isArray(data?.pendingInviteIds)
        ? data.pendingInviteIds
        : [],
      trackCount: data?.trackCount ?? 0,
      // Playback state
      currentlyPlayingTrack: data?.currentlyPlayingTrack ?? null,
      isPlaying: data?.isPlaying ?? false,
      playedTracks: Array.isArray(data?.playedTracks)
        ? data.playedTracks.map((pt: any) => ({
            ...pt,
            playedAt: this.toDate(pt.playedAt)
          }))
        : []
    } as Event;
  }

  // ===== PLAYBACK MANAGEMENT =====

  /**
   * Start playback of a track
   * Sets currentlyPlayingTrack with track metadata
   */
  static async startTrackPlayback(
    eventId: string,
    track: EventTrack,
    hostId: string
  ): Promise<void> {
    const eventRef = doc(db, this.collection, eventId);

    const currentlyPlayingTrack: CurrentlyPlayingTrack = {
      trackId: track.trackId,
      title: track.track.title || 'Unknown',
      artist: track.track.artist?.name || 'Unknown',
      albumCover: track.track.album?.coverMedium,
      duration: track.track.duration || 0,
      explicitLyrics: track.track.explicitLyrics || false
    };

    await updateDoc(eventRef, {
      currentlyPlayingTrack,
      isPlaying: true,
      updatedAt: serverTimestamp()
    });

    Logger.info('Track playback started', { eventId, trackId: track.trackId });
  }

  /**
   * Pause playback
   */
  static async pausePlayback(eventId: string, hostId: string): Promise<void> {
    await updateDoc(doc(db, this.collection, eventId), {
      isPlaying: false,
      updatedAt: serverTimestamp()
    });

    Logger.info('Playback paused', { eventId });
  }

  /**
   * Resume playback
   */
  static async resumePlayback(eventId: string, hostId: string): Promise<void> {
    await updateDoc(doc(db, this.collection, eventId), {
      isPlaying: true,
      updatedAt: serverTimestamp()
    });

    Logger.info('Playback resumed', { eventId });
  }

  /**
   * Finish track (played to the end)
   * Moves track to playedTracks and deletes from queue
   */
  static async finishTrack(eventId: string, hostId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, this.collection, eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const event = eventSnap.data() as Event;
      const currentTrack = event.currentlyPlayingTrack;

      if (!currentTrack) {
        throw new Error('No track is currently playing');
      }

      // Get voteCount from tracks subcollection
      const trackRef = doc(
        db,
        this.collection,
        eventId,
        this.tracksCollection,
        currentTrack.trackId
      );
      const trackSnap = await transaction.get(trackRef);
      const trackData = trackSnap.exists()
        ? (trackSnap.data() as EventTrackDoc)
        : null;

      // Create PlayedTrack
      // Note: serverTimestamp() cannot be used inside arrayUnion() in transactions
      // Use Timestamp.now() instead
      const playedTrack: PlayedTrack = {
        trackId: currentTrack.trackId,
        title: currentTrack.title,
        artist: currentTrack.artist,
        albumCover: currentTrack.albumCover,
        duration: currentTrack.duration,
        playedAt: Timestamp.now(),
        voteCount: trackData?.voteCount || 0,
        skipped: false
      };

      // Update event
      transaction.update(eventRef, {
        currentlyPlayingTrack: null,
        isPlaying: false,
        playedTracks: arrayUnion(playedTrack),
        updatedAt: serverTimestamp()
      });

      // Delete track from queue if exists
      if (trackSnap.exists()) {
        transaction.delete(trackRef);
      }
    });

    Logger.info('Track finished', { eventId });
  }

  /**
   * Skip track (didn't play to the end)
   * Moves track to playedTracks with skipped flag and deletes from queue
   */
  static async skipTrack(eventId: string, hostId: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, this.collection, eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const event = eventSnap.data() as Event;
      const currentTrack = event.currentlyPlayingTrack;

      if (!currentTrack) {
        throw new Error('No track is currently playing');
      }

      // Get voteCount from tracks subcollection
      const trackRef = doc(
        db,
        this.collection,
        eventId,
        this.tracksCollection,
        currentTrack.trackId
      );
      const trackSnap = await transaction.get(trackRef);
      const trackData = trackSnap.exists()
        ? (trackSnap.data() as EventTrackDoc)
        : null;

      // Create PlayedTrack with skipped: true
      // Note: serverTimestamp() cannot be used inside arrayUnion() in transactions
      // Use Timestamp.now() instead
      const playedTrack: PlayedTrack = {
        trackId: currentTrack.trackId,
        title: currentTrack.title,
        artist: currentTrack.artist,
        albumCover: currentTrack.albumCover,
        duration: currentTrack.duration,
        playedAt: Timestamp.now(),
        voteCount: trackData?.voteCount || 0,
        skipped: true
      };

      // Update event
      transaction.update(eventRef, {
        currentlyPlayingTrack: null,
        isPlaying: false,
        playedTracks: arrayUnion(playedTrack),
        updatedAt: serverTimestamp()
      });

      // Delete track from queue if exists
      if (trackSnap.exists()) {
        transaction.delete(trackRef);
      }
    });

    Logger.info('Track skipped', { eventId });
  }
}

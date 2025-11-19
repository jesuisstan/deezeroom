import { useEffect, useMemo, useState } from 'react';

import { Event, EventService } from '@/utils/firebase/firebase-service-events';

/**
 * Custom hook that provides real-time event status updates
 * Automatically recalculates status based on startAt/endAt timestamps
 * Uses optimized update intervals to minimize performance impact
 *
 * @param event - Event object to track status for
 * @returns Object containing eventStatus, isEventEnded, hasEventStarted
 */
export function useEventStatus(event: Event | null) {
  const [statusUpdateTrigger, setStatusUpdateTrigger] = useState(0);

  // Update status-related values periodically to reflect real-time changes
  // Uses different intervals based on event status to optimize performance
  useEffect(() => {
    if (!event) return;

    // Check if event has ended - no need to update if it's already ended
    if (EventService.hasEventEnded(event)) {
      return; // Don't update if event has ended
    }

    // Calculate time until next status change
    const getNextUpdateDelay = (): number => {
      const now = Date.now();
      const startAt = event.startAt
        ? new Date(event.startAt as any).getTime()
        : null;
      const endAt = event.endAt ? new Date(event.endAt as any).getTime() : null;

      if (!startAt || !endAt) {
        return 15000; // 15 seconds if dates are missing
      }

      const timeUntilStart = startAt - now;
      const timeUntilEnd = endAt - now;

      // If event hasn't started yet
      if (timeUntilStart > 0) {
        // Update every second if < 30 seconds until start, otherwise every 15 seconds
        return timeUntilStart < 30000 ? 1000 : 15000;
      }

      // If event is live
      if (timeUntilEnd > 0) {
        // Update every second if < 30 seconds until end, otherwise every 15 seconds
        return timeUntilEnd < 30000 ? 1000 : 15000;
      }

      // Should not reach here (event ended check is above), but just in case
      return 15000;
    };

    const scheduleUpdate = () => {
      const delay = getNextUpdateDelay();
      const timeoutId = setTimeout(() => {
        setStatusUpdateTrigger((prev) => prev + 1);
        scheduleUpdate(); // Schedule next update
      }, delay);

      return () => clearTimeout(timeoutId);
    };

    const cleanup = scheduleUpdate();
    return cleanup;
  }, [event]);

  // Recalculate status-related values when event changes or time passes
  const isEventEnded = useMemo(() => {
    if (!event) return false;
    return EventService.hasEventEnded(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, statusUpdateTrigger]);

  const hasEventStarted = useMemo(() => {
    if (!event) return false;
    return EventService.hasEventStarted(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, statusUpdateTrigger]);

  const eventStatus = useMemo(() => {
    if (!event) return 'draft';
    return EventService.getStatus(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, statusUpdateTrigger]);

  return {
    eventStatus,
    isEventEnded,
    hasEventStarted
  };
}

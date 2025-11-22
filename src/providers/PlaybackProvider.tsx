import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react';

import type { AudioStatus } from 'expo-audio';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus
} from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { Track } from '@/graphql/schema';
import { Notifier } from '@/modules/notifier';
import { useUser } from '@/providers/UserProvider';

export type PlaybackQueueSource = 'search' | 'playlist' | 'event' | 'custom';
export type RepeatMode = 'off' | 'one' | 'all';

export interface PlaybackQueueContext {
  source: PlaybackQueueSource;
  label: string;
  id?: string;
}

interface PlaybackStateContextValue {
  queue: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  queueContext: PlaybackQueueContext | null;
}

interface PlaybackUIStatusContextValue {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  repeatMode: RepeatMode;
}

interface PlaybackActionsContextValue {
  startPlayback: (
    tracks: Track[],
    trackId: string,
    context?: PlaybackQueueContext
  ) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  updateQueue: (tracks: Track[], context?: PlaybackQueueContext | null) => void;
  cycleRepeatMode: () => void;
}

const PlaybackStateContext = createContext<
  PlaybackStateContextValue | undefined
>(undefined);

interface PlaybackStatusStore {
  getSnapshot: () => AudioStatus | null;
  subscribe: (listener: () => void) => () => void;
}

const PlaybackStatusStoreContext = createContext<
  PlaybackStatusStore | undefined
>(undefined);

const PlaybackActionsContext = createContext<
  PlaybackActionsContextValue | undefined
>(undefined);

const PlaybackUIStatusContext = createContext<
  PlaybackUIStatusContextValue | undefined
>(undefined);

const findNextPlayableIndex = (
  tracks: Track[],
  startIndex: number,
  direction: 1 | -1
) => {
  let index = startIndex;
  while (index >= 0 && index < tracks.length) {
    if (tracks[index]?.preview) {
      return index;
    }
    index += direction;
  }
  return -1;
};

const PlaybackProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const player = useAudioPlayer(null, { keepAudioSessionActive: true });
  const statusRef = useRef<AudioStatus | null>(null);
  const statusListenersRef = useRef(new Set<() => void>());

  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [queueContext, setQueueContext] = useState<PlaybackQueueContext | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackIntent, setPlaybackIntentState] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  const autoPlayRef = useRef(false);
  const playbackIntentRef = useRef(false);
  const currentTrackRef = useRef<Track | null>(null);
  const currentIndexRef = useRef<number>(-1);
  const didFinishHandledRef = useRef(false);
  const queueRef = useRef<Track[]>([]);
  const repeatModeRef = useRef<RepeatMode>('off');

  const setPlaybackIntent = useCallback((intent: boolean) => {
    playbackIntentRef.current = intent;
    setPlaybackIntentState(intent);
  }, []);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((previous) => {
      switch (previous) {
        case 'off':
          return 'all';
        case 'all':
          return 'one';
        default:
          return 'off';
      }
    });
  }, []);

  const notifyStatusListeners = useCallback(() => {
    statusListenersRef.current.forEach((listener) => listener());
  }, []);

  const handleStatusChange = useCallback(
    (nextStatus: AudioStatus | null) => {
      if (!nextStatus?.didJustFinish) {
        didFinishHandledRef.current = false;
      }

      statusRef.current = nextStatus ?? null;
      notifyStatusListeners();

      if (!nextStatus?.didJustFinish) {
        return;
      }

      if (didFinishHandledRef.current) {
        return;
      }

      didFinishHandledRef.current = true;

      if (repeatModeRef.current === 'one') {
        player.seekTo(0).catch(() => null);

        if (playbackIntentRef.current) {
          autoPlayRef.current = true;
          setPlaybackIntent(true);
          try {
            player.play();
          } catch {
            setPlaybackIntent(false);
            autoPlayRef.current = false;
          }
        } else {
          autoPlayRef.current = false;
        }

        return;
      }

      const queueSnapshot = queueRef.current;
      const previousIndex = currentIndexRef.current;
      const nextIndex = findNextPlayableIndex(
        queueSnapshot,
        previousIndex + 1,
        1
      );

      if (nextIndex !== -1) {
        autoPlayRef.current = true;
        setPlaybackIntent(true);
        currentIndexRef.current = nextIndex;
        currentTrackRef.current = queueSnapshot[nextIndex] ?? null;
        setCurrentIndex(nextIndex);
        return;
      }

      const firstPlayableIndex = findNextPlayableIndex(queueSnapshot, 0, 1);
      if (repeatModeRef.current === 'all' && firstPlayableIndex !== -1) {
        autoPlayRef.current = true;
        setPlaybackIntent(true);
        currentIndexRef.current = firstPlayableIndex;
        currentTrackRef.current = queueSnapshot[firstPlayableIndex] ?? null;
        setCurrentIndex(firstPlayableIndex);
        return;
      }

      autoPlayRef.current = false;
      setPlaybackIntent(false);

      try {
        player.pause();
      } catch {
        // no-op
      }

      if (firstPlayableIndex !== -1) {
        currentIndexRef.current = firstPlayableIndex;
        currentTrackRef.current = queueSnapshot[firstPlayableIndex] ?? null;

        if (previousIndex === firstPlayableIndex) {
          player.seekTo(0).catch(() => null);
        } else {
          setCurrentIndex(firstPlayableIndex);
        }
        return;
      }

      currentIndexRef.current = -1;
      currentTrackRef.current = null;
      setCurrentIndex(-1);
    },
    [notifyStatusListeners, player, setPlaybackIntent]
  );

  const currentTrack =
    currentIndex >= 0 && currentIndex < queue.length
      ? queue[currentIndex]
      : null;
  // Use playbackIntent as the source of truth for UI to avoid delays
  // This provides instant feedback without waiting for expo-audio status updates
  const isPlaying = playbackIntent;

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
      interruptionModeAndroid: 'duckOthers'
    }).catch((audioModeError) => {
      console.warn('Failed to configure audio session', audioModeError);
    });
  }, []);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // Keep device awake during playback to prevent JS throttling
  useEffect(() => {
    if (currentTrack && playbackIntent) {
      // Activate wake lock when playing
      console.log('[PlaybackProvider] Activating wake lock');
      activateKeepAwakeAsync('playback').catch((error) => {
        console.warn('[PlaybackProvider] Failed to activate wake lock:', error);
      });

      return () => {
        // Deactivate wake lock when stopped
        console.log('[PlaybackProvider] Deactivating wake lock');
        deactivateKeepAwake('playback');
      };
    }
  }, [currentTrack, playbackIntent]);

  // Periodic status check - helps catch track finish while app is in foreground
  // Note: With wake lock active, this should work even with screen off
  useEffect(() => {
    if (!currentTrack || !playbackIntent) {
      return;
    }

    const checkInterval = setInterval(() => {
      const status = statusRef.current;

      // Skip if already handled or no status
      if (!status || didFinishHandledRef.current) {
        return;
      }

      // Check if track finished
      const isFinished =
        status.didJustFinish ||
        (status.currentTime &&
          status.duration &&
          status.currentTime >= status.duration - 0.5);

      if (isFinished) {
        console.log('[PlaybackProvider] Periodic check: track finished');
        handleStatusChange(status);
      }
    }, 1000); // Check every second

    return () => clearInterval(checkInterval);
  }, [currentTrack, playbackIntent, handleStatusChange]);

  // Clear playback state when user logs out
  useEffect(() => {
    if (!user) {
      // User logged out - stop playback and clear queue
      try {
        player.pause();
      } catch {
        // Ignore errors if player is already stopped
      }
      setQueue([]);
      setCurrentIndex(-1);
      setQueueContext(null);
      setPlaybackIntent(false);
      setError(null);
      setIsLoading(false);
      autoPlayRef.current = false;
      currentTrackRef.current = null;
      currentIndexRef.current = -1;
      queueRef.current = [];
    }
  }, [user, player, setPlaybackIntent]);

  useEffect(() => {
    if (!currentTrack) {
      setIsLoading(false);
      setError(null);
      setPlaybackIntent(false);
      autoPlayRef.current = false;
      return;
    }

    if (!currentTrack.preview) {
      const message = 'Preview not available for this track';
      setError(message);
      Notifier.error(message);
      autoPlayRef.current = false;
      setPlaybackIntent(false);
      return;
    }

    let cancelled = false;

    const loadAndPlay = async () => {
      try {
        setIsLoading(true);
        await player.replace({ uri: currentTrack.preview });
        if (cancelled) {
          return;
        }
        setError((previous) => (previous !== null ? null : previous));
        if (autoPlayRef.current) {
          await player.play();
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load this preview');
          Notifier.error('Unable to load this preview');
          setPlaybackIntent(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          autoPlayRef.current = false;
        }
      }
    };

    loadAndPlay();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, player, setPlaybackIntent]);

  const updateQueue = useCallback(
    (tracks: Track[], context?: PlaybackQueueContext | null) => {
      const activeId = currentTrackRef.current?.id ?? null;
      const nextIndex =
        activeId !== null
          ? tracks.findIndex((track) => track.id === activeId)
          : -1;

      // Preserve the existing playback queue if the updated list no longer
      // contains the currently playing track. This keeps playback alive while
      // new search results stream in.
      if (activeId !== null && nextIndex === -1) {
        return;
      }

      if (context !== undefined) {
        setQueueContext(context);
      }

      const sameLength = queue.length === tracks.length;
      const sameOrder =
        sameLength &&
        queue.every((prevTrack, index) => prevTrack.id === tracks[index]?.id);

      if (!sameOrder) {
        setQueue([...tracks]);
      }

      if (activeId !== null && nextIndex !== -1) {
        currentIndexRef.current = nextIndex;
        currentTrackRef.current = tracks[nextIndex] ?? null;
        setCurrentIndex(nextIndex);
      } else if (activeId === null) {
        currentIndexRef.current = -1;
        currentTrackRef.current = null;
        setCurrentIndex(-1);
        setPlaybackIntent(false);
        autoPlayRef.current = false;
        setQueueContext(context ?? null);
      } else if (tracks.length === 0) {
        setQueueContext(context ?? null);
      }
    },
    [queue, setPlaybackIntent, setQueueContext]
  );
  const startPlayback = useCallback(
    (tracks: Track[], trackId: string, context?: PlaybackQueueContext) => {
      if (!tracks.length) {
        Notifier.error('No tracks to play yet');
        return;
      }

      const targetIndex = tracks.findIndex((track) => track.id === trackId);
      if (targetIndex === -1) {
        Notifier.error('Selected track is not in the current list');
        return;
      }

      const targetTrack = tracks[targetIndex];
      if (!targetTrack.preview) {
        Notifier.error('Preview not available for this track');
        return;
      }

      const queueContextToUse: PlaybackQueueContext = context ?? {
        source: 'search',
        label: 'MIX'
      };

      const isSameTrack = currentTrackRef.current?.id === targetTrack.id;

      if (isSameTrack) {
        if (!statusRef.current?.playing) {
          try {
            setPlaybackIntent(true);
            autoPlayRef.current = true;
            player.play();
          } catch (resumeError) {
            console.warn('Failed to resume playback', resumeError);
            Notifier.error('Unable to resume playback');
            setPlaybackIntent(false);
            autoPlayRef.current = false;
          }
        }
        updateQueue(tracks, queueContextToUse);
        return;
      }

      currentTrackRef.current = targetTrack;
      currentIndexRef.current = targetIndex;

      updateQueue(tracks, queueContextToUse);

      setPlaybackIntent(true);
      autoPlayRef.current = true;
      setCurrentIndex(targetIndex);
    },
    [player, setPlaybackIntent, updateQueue]
  );

  const togglePlayPause = useCallback(() => {
    if (!currentTrackRef.current) {
      if (queue.length === 0) {
        Notifier.error('No track selected');
        return;
      }

      const firstPlayable = findNextPlayableIndex(queue, 0, 1);
      if (firstPlayable === -1) {
        Notifier.error('No playable previews in the list');
        return;
      }

      setPlaybackIntent(true);
      autoPlayRef.current = true;
      currentIndexRef.current = firstPlayable;
      currentTrackRef.current = queue[firstPlayable] ?? null;
      setCurrentIndex(firstPlayable);
      return;
    }

    try {
      // Use playbackIntentRef instead of player status for instant toggle
      // This avoids delays waiting for expo-audio status updates
      if (playbackIntentRef.current) {
        setPlaybackIntent(false);
        autoPlayRef.current = false;
        player.pause();
      } else {
        setPlaybackIntent(true);
        autoPlayRef.current = true;
        player.play();
      }
    } catch (playbackError) {
      console.warn('Playback toggle failed', playbackError);
      if (!playbackIntentRef.current) {
        Notifier.error('Unable to start playback');
      }
      setPlaybackIntent(false);
      autoPlayRef.current = false;
    }
  }, [player, queue, setPlaybackIntent]);

  const playNext = useCallback(() => {
    if (!queue.length) {
      return;
    }

    const nextIndex = findNextPlayableIndex(queue, currentIndex + 1, 1);
    if (nextIndex === -1) {
      Notifier.error('Reached the end of the list');
      return;
    }

    setPlaybackIntent(true);
    autoPlayRef.current = true;
    currentIndexRef.current = nextIndex;
    currentTrackRef.current = queue[nextIndex] ?? null;
    setCurrentIndex(nextIndex);
  }, [currentIndex, queue, setPlaybackIntent]);

  const playPrevious = useCallback(() => {
    if (!queue.length) {
      return;
    }

    const hasCurrentTrack =
      currentIndex >= 0 && currentIndex < queue.length && queue[currentIndex];
    const positionSeconds = statusRef.current?.currentTime ?? 0;

    if (!hasCurrentTrack) {
      return;
    }

    const restartCurrentTrack = (shouldPlay: boolean) => {
      player.seekTo(0).catch(() => null);
      if (shouldPlay) {
        setPlaybackIntent(true);
        autoPlayRef.current = true;
        player.play();
      } else {
        autoPlayRef.current = false;
      }
    };

    const shouldResume = playbackIntentRef.current;

    if (positionSeconds > 5) {
      restartCurrentTrack(shouldResume);
      return;
    }

    const previousIndex = findNextPlayableIndex(queue, currentIndex - 1, -1);
    if (previousIndex === -1) {
      restartCurrentTrack(shouldResume);
      return;
    }

    setPlaybackIntent(true);
    autoPlayRef.current = true;
    currentIndexRef.current = previousIndex;
    currentTrackRef.current = queue[previousIndex] ?? null;
    setCurrentIndex(previousIndex);
  }, [currentIndex, player, queue, setPlaybackIntent]);

  const pause = useCallback(() => {
    try {
      setPlaybackIntent(false);
      autoPlayRef.current = false;
      player.pause();
    } catch (pauseError) {
      console.warn('Failed to pause playback', pauseError);
    }
  }, [player, setPlaybackIntent]);

  const resume = useCallback(() => {
    if (!currentTrackRef.current) {
      return;
    }
    try {
      setPlaybackIntent(true);
      autoPlayRef.current = true;
      player.play();
    } catch (resumeError) {
      console.warn('Failed to resume playback', resumeError);
      Notifier.error('Unable to resume playback');
      setPlaybackIntent(false);
      autoPlayRef.current = false;
    }
  }, [player, setPlaybackIntent]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.seekTo(Math.max(0, seconds)).catch(() => null);
    },
    [player]
  );

  // Separate context values for optimal re-renders
  const stateValue: PlaybackStateContextValue = useMemo(
    () => ({
      queue,
      currentTrack,
      currentIndex,
      queueContext
    }),
    [queue, currentTrack, currentIndex, queueContext]
  );

  const statusStore = useMemo<PlaybackStatusStore>(
    () => ({
      getSnapshot: () => statusRef.current,
      subscribe: (listener: () => void) => {
        statusListenersRef.current.add(listener);
        return () => {
          statusListenersRef.current.delete(listener);
        };
      }
    }),
    []
  );

  // UI-only status value that does NOT include `status` ticks
  const uiStatusValue: PlaybackUIStatusContextValue = useMemo(
    () => ({
      isPlaying,
      isLoading,
      error,
      repeatMode
    }),
    [error, isLoading, isPlaying, repeatMode]
  );

  const actionsValue: PlaybackActionsContextValue = useMemo(
    () => ({
      startPlayback,
      togglePlayPause,
      playNext,
      playPrevious,
      pause,
      resume,
      seekTo,
      updateQueue,
      cycleRepeatMode
    }),
    [
      startPlayback,
      togglePlayPause,
      playNext,
      playPrevious,
      pause,
      resume,
      seekTo,
      updateQueue,
      cycleRepeatMode
    ]
  );

  return (
    <PlaybackStateContext.Provider value={stateValue}>
      <PlaybackUIStatusContext.Provider value={uiStatusValue}>
        <PlaybackActionsContext.Provider value={actionsValue}>
          <PlaybackStatusStoreContext.Provider value={statusStore}>
            {children}
            <PlaybackStatusBridge
              player={player}
              onStatusChange={handleStatusChange}
            />
          </PlaybackStatusStoreContext.Provider>
        </PlaybackActionsContext.Provider>
      </PlaybackUIStatusContext.Provider>
    </PlaybackStateContext.Provider>
  );
};

function PlaybackStatusBridge({
  player,
  onStatusChange
}: {
  player: ReturnType<typeof useAudioPlayer>;
  onStatusChange: (status: AudioStatus | null) => void;
}) {
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    onStatusChange(status ?? null);
  }, [status, onStatusChange]);

  return null;
}

/**
 * Hook for accessing playback state (queue, currentTrack, currentIndex).
 * Components using this hook will only re-render when these values change.
 */
const usePlaybackState = () => {
  const context = useContext(PlaybackStateContext);
  if (!context) {
    throw new Error('usePlaybackState must be used within a PlaybackProvider');
  }
  return context;
};

/**
 * Hook for accessing playback status (isPlaying, isLoading, status, error).
 * Components using this hook will re-render on status changes (including progress updates).
 * Use sparingly for components that need real-time playback status.
 */
const useAudioStatus = () => {
  const store = useContext(PlaybackStatusStoreContext);
  if (!store) {
    throw new Error('useAudioStatus must be used within a PlaybackProvider');
  }
  const status = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return { status };
};

/**
 * Hook for accessing UI playback status (isPlaying, isLoading, error only).
 * Components using this hook will NOT re-render on position ticks.
 */
const usePlaybackUI = () => {
  const context = useContext(PlaybackUIStatusContext);
  if (!context) {
    throw new Error('usePlaybackUI must be used within a PlaybackProvider');
  }
  return context;
};

/**
 * Hook for accessing playback control functions.
 * This hook never causes re-renders as functions are stable (memoized).
 */
const usePlaybackActions = () => {
  const context = useContext(PlaybackActionsContext);
  if (!context) {
    throw new Error(
      'usePlaybackActions must be used within a PlaybackProvider'
    );
  }
  return context;
};

export {
  PlaybackProvider,
  useAudioStatus,
  usePlaybackActions,
  usePlaybackState,
  usePlaybackUI
};

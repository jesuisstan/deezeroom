import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import TrackPlayer, {
  Event,
  State,
  usePlaybackState as useTrackPlayerState,
  useProgress,
  useTrackPlayerEvents
} from 'react-native-track-player';

import { Track } from '@/graphql/schema';
import { Notifier } from '@/modules/notifier';
import { useUser } from '@/providers/UserProvider';
import {
  convertRepeatMode,
  convertToTrackPlayerTrack,
  setupTrackPlayer
} from '@/services/trackPlayerService';

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

// For compatibility with ProgressBar and other components expecting AudioStatus
interface AudioStatus {
  playing: boolean;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
}

interface PlaybackStatusStore {
  getSnapshot: () => AudioStatus | null;
  subscribe: (listener: () => void) => () => void;
}

const PlaybackStateContext = createContext<
  PlaybackStateContextValue | undefined
>(undefined);

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
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [queueContext, setQueueContext] = useState<PlaybackQueueContext | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  // Use TrackPlayer hooks
  const playerState = useTrackPlayerState();
  const progress = useProgress();

  // Refs for stable access
  const queueRef = useRef<Track[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const statusListenersRef = useRef(new Set<() => void>());
  const statusRef = useRef<AudioStatus | null>(null);

  // Initialize TrackPlayer
  useEffect(() => {
    let isMounted = true;

    setupTrackPlayer()
      .then(() => {
        if (isMounted) {
          setIsPlayerReady(true);
          console.log('[PlaybackProvider] TrackPlayer ready');
        }
      })
      .catch((error) => {
        console.error('[PlaybackProvider] TrackPlayer setup failed:', error);
        if (isMounted) {
          setError('Failed to initialize player');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update refs
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Compute isPlaying and isLoading from TrackPlayer state
  const isPlaying = playerState.state === State.Playing;
  const isLoading =
    playerState.state === State.Buffering ||
    playerState.state === State.None ||
    playerState.state === State.Ready;

  const currentTrack =
    currentIndex >= 0 && currentIndex < queue.length
      ? queue[currentIndex]
      : null;

  // Create AudioStatus for compatibility
  const notifyStatusListeners = useCallback(() => {
    statusListenersRef.current.forEach((listener) => listener());
  }, []);

  useEffect(() => {
    const audioStatus: AudioStatus = {
      playing: isPlaying,
      currentTime: progress.position,
      duration: progress.duration,
      didJustFinish: false
    };
    statusRef.current = audioStatus;
    notifyStatusListeners();
  }, [isPlaying, progress.position, progress.duration, notifyStatusListeners]);

  // Handle track changes
  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async (event) => {
    if (event.type === Event.PlaybackActiveTrackChanged) {
      const trackIndex = event.index;
      if (trackIndex !== null && trackIndex !== undefined) {
        console.log('[PlaybackProvider] Track changed to index:', trackIndex);
        setCurrentIndex(trackIndex);
      }
    }
  });

  // Cycle repeat mode
  const cycleRepeatMode = useCallback(async () => {
    const nextMode: RepeatMode =
      repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';

    setRepeatMode(nextMode);
    await TrackPlayer.setRepeatMode(convertRepeatMode(nextMode));
    console.log('[PlaybackProvider] Repeat mode:', nextMode);
  }, [repeatMode]);

  // Clear playback state when user logs out
  useEffect(() => {
    if (!user) {
      TrackPlayer.reset().catch(() => null);
      setQueue([]);
      setCurrentIndex(-1);
      setQueueContext(null);
      setError(null);
      queueRef.current = [];
      currentIndexRef.current = -1;
    }
  }, [user]);

  const updateQueue = useCallback(
    async (tracks: Track[], context?: PlaybackQueueContext | null) => {
      if (!isPlayerReady) {
        console.warn('[PlaybackProvider] Player not ready');
        return;
      }

      const activeId = currentTrack?.id ?? null;
      const nextIndex =
        activeId !== null
          ? tracks.findIndex((track) => track.id === activeId)
          : -1;

      // Preserve queue if current track not in new list
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

        // Update TrackPlayer queue
        try {
          await TrackPlayer.reset();
          const trackPlayerTracks = tracks
            .filter((t) => t.preview)
            .map((t, idx) => convertToTrackPlayerTrack(t, idx));

          if (trackPlayerTracks.length > 0) {
            await TrackPlayer.add(trackPlayerTracks);
          }
        } catch (error) {
          console.error('[PlaybackProvider] Error updating queue:', error);
        }
      }

      if (activeId !== null && nextIndex !== -1) {
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);
      } else if (activeId === null) {
        currentIndexRef.current = -1;
        setCurrentIndex(-1);
        setQueueContext(context ?? null);
      } else if (tracks.length === 0) {
        setQueueContext(context ?? null);
      }
    },
    [queue, currentTrack, isPlayerReady]
  );

  const startPlayback = useCallback(
    async (
      tracks: Track[],
      trackId: string,
      context?: PlaybackQueueContext
    ) => {
      if (!isPlayerReady) {
        Notifier.error('Player is initializing...');
        return;
      }

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

      const isSameTrack = currentTrack?.id === targetTrack.id;

      try {
        if (isSameTrack) {
          // Resume if same track
          const state = await TrackPlayer.getPlaybackState();
          if (state.state !== State.Playing) {
            await TrackPlayer.play();
          }
          await updateQueue(tracks, queueContextToUse);
          return;
        }

        // Set up new queue
        setQueue([...tracks]);
        setQueueContext(queueContextToUse);
        setCurrentIndex(targetIndex);
        currentIndexRef.current = targetIndex;

        // Load tracks into TrackPlayer
        await TrackPlayer.reset();
        const trackPlayerTracks = tracks
          .filter((t) => t.preview)
          .map((t, idx) => convertToTrackPlayerTrack(t, idx));

        if (trackPlayerTracks.length > 0) {
          await TrackPlayer.add(trackPlayerTracks);

          // Find index in filtered tracks
          const playableIndex = trackPlayerTracks.findIndex(
            (t) => t.id === trackId
          );
          if (playableIndex !== -1) {
            await TrackPlayer.skip(playableIndex);
            await TrackPlayer.play();
          }
        }
      } catch (error) {
        console.error('[PlaybackProvider] Error starting playback:', error);
        Notifier.error('Unable to start playback');
      }
    },
    [currentTrack, isPlayerReady, updateQueue]
  );

  const togglePlayPause = useCallback(async () => {
    if (!isPlayerReady) {
      return;
    }

    try {
      if (!currentTrack) {
        if (queue.length === 0) {
          Notifier.error('No track selected');
          return;
        }

        const firstPlayable = findNextPlayableIndex(queue, 0, 1);
        if (firstPlayable === -1) {
          Notifier.error('No playable previews in the list');
          return;
        }

        // Start first playable track
        await startPlayback(queue, queue[firstPlayable].id);
        return;
      }

      const state = await TrackPlayer.getPlaybackState();
      if (state.state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error('[PlaybackProvider] Toggle play/pause error:', error);
      Notifier.error('Unable to toggle playback');
    }
  }, [currentTrack, queue, isPlayerReady, startPlayback]);

  const playNext = useCallback(async () => {
    if (!isPlayerReady || !queue.length) {
      return;
    }

    try {
      await TrackPlayer.skipToNext();
    } catch (error) {
      console.warn('[PlaybackProvider] Skip next error:', error);
      Notifier.error('Reached the end of the list');
    }
  }, [isPlayerReady, queue]);

  const playPrevious = useCallback(async () => {
    if (!isPlayerReady || !queue.length) {
      return;
    }

    try {
      // Reset if > 5 seconds, otherwise skip to previous
      if (progress.position > 5) {
        await TrackPlayer.seekTo(0);
      } else {
        await TrackPlayer.skipToPrevious();
      }
    } catch (error) {
      console.warn('[PlaybackProvider] Skip previous error:', error);
    }
  }, [isPlayerReady, queue, progress.position]);

  const pause = useCallback(async () => {
    if (!isPlayerReady) {
      return;
    }

    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.warn('[PlaybackProvider] Pause error:', error);
    }
  }, [isPlayerReady]);

  const resume = useCallback(async () => {
    if (!isPlayerReady || !currentTrack) {
      return;
    }

    try {
      await TrackPlayer.play();
    } catch (error) {
      console.warn('[PlaybackProvider] Resume error:', error);
      Notifier.error('Unable to resume playback');
    }
  }, [isPlayerReady, currentTrack]);

  const seekTo = useCallback(
    async (seconds: number) => {
      if (!isPlayerReady) {
        return;
      }

      try {
        await TrackPlayer.seekTo(Math.max(0, seconds));
      } catch (error) {
        console.warn('[PlaybackProvider] Seek error:', error);
      }
    },
    [isPlayerReady]
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
          </PlaybackStatusStoreContext.Provider>
        </PlaybackActionsContext.Provider>
      </PlaybackUIStatusContext.Provider>
    </PlaybackStateContext.Provider>
  );
};

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
 * Hook for accessing playback status (compatible with expo-audio AudioStatus).
 * For ProgressBar and other components expecting AudioStatus format.
 */
const useAudioStatus = () => {
  const store = useContext(PlaybackStatusStoreContext);
  if (!store) {
    throw new Error('useAudioStatus must be used within a PlaybackProvider');
  }

  // Simple hook that returns the status without useSyncExternalStore
  // since we update it via useEffect
  const [status, setStatus] = React.useState(store.getSnapshot());

  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setStatus(store.getSnapshot());
    });
    return unsubscribe;
  }, [store]);

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

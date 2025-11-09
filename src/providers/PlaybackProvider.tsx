import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import type { AudioStatus } from 'expo-audio';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus
} from 'expo-audio';

import { Notifier } from '@/components/modules/notifier';
import { Track } from '@/graphql/schema';

interface PlaybackStateContextValue {
  queue: Track[];
  currentTrack: Track | null;
  currentIndex: number;
}

interface PlaybackStatusContextValue {
  status: AudioStatus | null;
}

interface PlaybackUIStatusContextValue {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

interface PlaybackActionsContextValue {
  startPlayback: (tracks: Track[], trackId: string) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  updateQueue: (tracks: Track[]) => void;
}

const PlaybackStateContext = createContext<
  PlaybackStateContextValue | undefined
>(undefined);

const PlaybackStatusContext = createContext<
  PlaybackStatusContextValue | undefined
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
  const player = useAudioPlayer(null, { keepAudioSessionActive: true });
  const status = useAudioPlayerStatus(player);

  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackIntent, setPlaybackIntentState] = useState(false);

  const autoPlayRef = useRef(false);
  const playbackIntentRef = useRef(false);
  const currentTrackRef = useRef<Track | null>(null);
  const currentIndexRef = useRef<number>(-1);
  const didFinishHandledRef = useRef(false);

  const setPlaybackIntent = useCallback((intent: boolean) => {
    playbackIntentRef.current = intent;
    setPlaybackIntentState(intent);
  }, []);

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

  useEffect(() => {
    if (!status?.didJustFinish) {
      didFinishHandledRef.current = false;
      return;
    }

    if (didFinishHandledRef.current) {
      return;
    }

    didFinishHandledRef.current = true;

    const baseIndex = currentIndexRef.current;
    const nextIndex = findNextPlayableIndex(queue, baseIndex + 1, 1);
    if (nextIndex !== -1) {
      autoPlayRef.current = true;
      setPlaybackIntent(true);
      currentIndexRef.current = nextIndex;
      currentTrackRef.current = queue[nextIndex] ?? null;
      setCurrentIndex(nextIndex);
      return;
    }

    autoPlayRef.current = false;
    setPlaybackIntent(false);
  }, [queue, setPlaybackIntent, status?.didJustFinish]);

  const updateQueue = useCallback(
    (tracks: Track[]) => {
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
      }
    },
    [queue, setPlaybackIntent]
  );

  const startPlayback = useCallback(
    (tracks: Track[], trackId: string) => {
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

      const isSameTrack = currentTrackRef.current?.id === targetTrack.id;

      if (isSameTrack) {
        if (!status?.playing) {
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
        updateQueue(tracks);
        return;
      }

      currentTrackRef.current = targetTrack;
      currentIndexRef.current = targetIndex;

      updateQueue(tracks);

      setPlaybackIntent(true);
      autoPlayRef.current = true;
      setCurrentIndex(targetIndex);
    },
    [player, setPlaybackIntent, status?.playing, updateQueue]
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
      // Use playbackIntentRef instead of status?.playing for instant toggle
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

    const previousIndex = findNextPlayableIndex(queue, currentIndex - 1, -1);
    if (previousIndex === -1) {
      Notifier.error('Already at the first track');
      return;
    }

    const shouldPlay = playbackIntentRef.current;
    autoPlayRef.current = shouldPlay;
    currentIndexRef.current = previousIndex;
    currentTrackRef.current = queue[previousIndex] ?? null;
    setCurrentIndex(previousIndex);
  }, [currentIndex, queue]);

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
      currentIndex
    }),
    [queue, currentTrack, currentIndex]
  );

  const statusValue: PlaybackStatusContextValue = useMemo(
    () => ({
      status: status ?? null
    }),
    [status]
  );

  // UI-only status value that does NOT include `status` ticks
  const uiStatusValue: PlaybackUIStatusContextValue = useMemo(
    () => ({
      isPlaying,
      isLoading,
      error
    }),
    [isPlaying, isLoading, error]
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
      updateQueue
    }),
    [
      startPlayback,
      togglePlayPause,
      playNext,
      playPrevious,
      pause,
      resume,
      seekTo,
      updateQueue
    ]
  );

  return (
    <PlaybackStateContext.Provider value={stateValue}>
      <PlaybackUIStatusContext.Provider value={uiStatusValue}>
        <PlaybackStatusContext.Provider value={statusValue}>
          <PlaybackActionsContext.Provider value={actionsValue}>
            {children}
          </PlaybackActionsContext.Provider>
        </PlaybackStatusContext.Provider>
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
 * Hook for accessing playback status (isPlaying, isLoading, status, error).
 * Components using this hook will re-render on status changes (including progress updates).
 * Use sparingly for components that need real-time playback status.
 */
const useAudioStatus = () => {
  const context = useContext(PlaybackStatusContext);
  if (!context) {
    throw new Error('useAudioStatus must be used within a PlaybackProvider');
  }
  return context;
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

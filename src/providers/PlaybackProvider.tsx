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
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { Track } from '@/graphql/schema';
import { Notifier } from '@/modules/notifier';

interface PlaybackContextValue {
  queue: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  status: AudioStatus | null;
  error: string | null;
  startPlayback: (tracks: Track[], trackId: string) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  updateQueue: (tracks: Track[]) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | undefined>(
  undefined
);

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
  const playerIsPlaying = status?.playing ?? false;
  const isPlaying = playbackIntent || playerIsPlaying;

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
      } catch (loadError) {
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
      if (status?.playing) {
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
      if (!status?.playing) {
        Notifier.error('Unable to start playback');
      }
      setPlaybackIntent(false);
      autoPlayRef.current = false;
    }
  }, [player, queue, setPlaybackIntent, status?.playing]);

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

  const contextValue: PlaybackContextValue = useMemo(
    () => ({
      queue,
      currentTrack,
      currentIndex,
      isPlaying,
      isLoading,
      status: status ?? null,
      error,
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
      queue,
      currentTrack,
      currentIndex,
      isPlaying,
      isLoading,
      status,
      error,
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
    <PlaybackContext.Provider value={contextValue}>
      {children}
    </PlaybackContext.Provider>
  );
};

const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};

export { PlaybackProvider, usePlayback };

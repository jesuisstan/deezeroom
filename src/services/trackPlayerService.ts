import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode as RNTPRepeatMode
} from 'react-native-track-player';

import { Track } from '@/graphql/schema';
import { RepeatMode } from '@/providers/PlaybackProvider';

/**
 * Initialize TrackPlayer with configuration
 * Must be called before using TrackPlayer
 */
export async function setupTrackPlayer() {
  try {
    await TrackPlayer.setupPlayer({
      autoUpdateMetadata: true,
      autoHandleInterruptions: true
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext
      ],
      progressUpdateEventInterval: 1
    });

    console.log('[TrackPlayer] Setup complete');
  } catch (error) {
    console.error('[TrackPlayer] Setup error:', error);
    throw error;
  }
}

/**
 * Convert Deezer Track to TrackPlayer Track format
 */
export function convertToTrackPlayerTrack(track: Track, index: number) {
  return {
    id: track.id,
    url: track.preview || '',
    title: track.title || 'Unknown Title',
    artist: track.artist?.name || 'Unknown Artist',
    artwork: track.album?.coverBig || track.album?.coverMedium || undefined,
    duration: track.duration || 0,
    // Store original track data for app logic
    data: track
  };
}

/**
 * Convert RepeatMode to TrackPlayer RepeatMode
 */
export function convertRepeatMode(mode: RepeatMode): RNTPRepeatMode {
  switch (mode) {
    case 'off':
      return RNTPRepeatMode.Off;
    case 'one':
      return RNTPRepeatMode.Track;
    case 'all':
      return RNTPRepeatMode.Queue;
    default:
      return RNTPRepeatMode.Off;
  }
}

/**
 * Convert TrackPlayer RepeatMode to app RepeatMode
 */
export function convertFromTrackPlayerRepeatMode(
  mode: RNTPRepeatMode
): RepeatMode {
  switch (mode) {
    case RNTPRepeatMode.Off:
      return 'off';
    case RNTPRepeatMode.Track:
      return 'one';
    case RNTPRepeatMode.Queue:
      return 'all';
    default:
      return 'off';
  }
}

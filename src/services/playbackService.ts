import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Playback Service for react-native-track-player
 * Handles playback events in background
 */
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('[PlaybackService] Remote play');
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('[PlaybackService] Remote pause');
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('[PlaybackService] Remote next');
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('[PlaybackService] Remote previous');
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    console.log('[PlaybackService] Remote seek:', event.position);
    TrackPlayer.seekTo(event.position);
  });
}

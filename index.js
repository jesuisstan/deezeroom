import 'expo-router/entry';

import TrackPlayer from 'react-native-track-player';

import { PlaybackService } from './src/services/playbackService';

// Register the playback service for background handling
// This must be called before the app starts
TrackPlayer.registerPlaybackService(() => PlaybackService);

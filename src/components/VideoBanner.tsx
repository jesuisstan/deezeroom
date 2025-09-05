import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import clsx from 'clsx';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoSource, VideoView } from 'expo-video';

type VideoBannerProps = {
  videoSource: VideoSource;
  loop?: boolean;
  className?: string;
};

const VideoBanner = ({
  videoSource,
  loop = false,
  className
}: VideoBannerProps) => {
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = loop;
    p.muted = true;
    p.play();
  });

  // Update loop behavior when loop prop changes
  useEffect(() => {
    player.loop = loop;
  }, [loop, player]);

  // Web auto-play: restart when player is ready
  const { status } = useEvent(player, 'statusChange', {
    status: player.status
  });
  useEffect(() => {
    if (status === 'readyToPlay') {
      try {
        player.muted = true;
        player.play();
      } catch {}
    }
  }, [status, player]);

  // Ensure playback on screen focus (e.g., when navigating back)
  useFocusEffect(
    useCallback(() => {
      try {
        player.muted = true;
        if (player.status === 'idle') {
          player.replace(videoSource);
        }
        player.play();
      } catch {}
      return () => {
        try {
          player.pause();
        } catch {}
      };
    }, [player, videoSource])
  );

  return (
    <View
      className={clsx(`w-full flex-1 items-center justify-center`, className)}
    >
      <VideoView
        style={{ width: '100%', height: '100%' }}
        player={player}
        contentFit="contain"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
};

export default VideoBanner;

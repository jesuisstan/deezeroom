import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import fallbackImage from '@/assets/images/logo/logo-heart-transparent.png';

type PlayerArtworkProps = {
  artworkSource: any;
  albumCoverUrl?: string;
  albumTitle?: string;
};

const FALLBACK_IMAGE = fallbackImage as ImageSourcePropType;

const PlayerArtwork = memo(
  ({ artworkSource, albumCoverUrl, albumTitle }: PlayerArtworkProps) => {
    const [showFallbackIcon, setShowFallbackIcon] = useState(false);

    useEffect(() => {
      setShowFallbackIcon(false);
    }, [artworkSource, albumCoverUrl]);

    const resolvedSource = useMemo<ImageSourcePropType>(() => {
      if (typeof artworkSource === 'number') {
        return artworkSource;
      }

      if (
        artworkSource &&
        typeof artworkSource === 'object' &&
        'uri' in artworkSource &&
        typeof (artworkSource as { uri?: unknown }).uri === 'string' &&
        ((artworkSource as { uri: string }).uri?.length ?? 0) > 0
      ) {
        return artworkSource as ImageSourcePropType;
      }

      if (albumCoverUrl) {
        return { uri: albumCoverUrl };
      }

      return FALLBACK_IMAGE;
    }, [albumCoverUrl, artworkSource]);

    const handleImageError = useCallback(() => {
      setShowFallbackIcon(true);
    }, []);

    return (
      <View className="flex-1 items-center justify-center">
        <View className="aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-bg-secondary">
          {showFallbackIcon ? (
            <MaterialCommunityIcons
              name="image-off-outline"
              size={48}
              color="#7328b5"
              accessibilityLabel="Artwork unavailable"
            />
          ) : (
            <Image
              source={resolvedSource}
              style={{ width: '100%', height: '100%' }}
              resizeMode={albumCoverUrl ? 'cover' : 'contain'}
              accessibilityLabel={
                albumTitle ? `${albumTitle} cover art` : 'Default cover art'
              }
              onError={handleImageError}
            />
          )}
        </View>
      </View>
    );
  },
  (prev, next) =>
    prev.artworkSource === next.artworkSource &&
    prev.albumCoverUrl === next.albumCoverUrl &&
    prev.albumTitle === next.albumTitle
);

PlayerArtwork.displayName = 'PlayerArtwork';

export default PlayerArtwork;

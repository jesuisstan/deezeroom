import { memo } from 'react';
import { Image, View } from 'react-native';

type PlayerArtworkProps = {
  artworkSource: any;
  albumCoverUrl?: string;
  albumTitle?: string;
};

const PlayerArtwork = memo(
  ({ artworkSource, albumCoverUrl, albumTitle }: PlayerArtworkProps) => {
    //console.log('🖼️ Props:', {
    //  artworkSourceType: typeof artworkSource,
    //  artworkSourceUri: artworkSource?.uri,
    //  albumCoverUrl,
    //  albumTitle
    //});

    return (
      <View className="flex-1 items-center justify-center">
        <View className="aspect-square w-full overflow-hidden rounded-3xl bg-bg-secondary">
          <Image
            source={artworkSource}
            style={{ width: '100%', height: '100%' }}
            resizeMode={albumCoverUrl ? 'cover' : 'contain'}
            accessibilityLabel={
              albumTitle ? `${albumTitle} cover art` : 'Default cover art'
            }
          />
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

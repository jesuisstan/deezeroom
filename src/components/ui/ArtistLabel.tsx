import { FC } from 'react';
import { Image, View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import type { DeezerArtist } from '@/utils/deezer/deezer-types';

const ArtistLabel: FC<{ artist: DeezerArtist }> = ({ artist }) => {
  const { theme } = useTheme();
  return (
    <View className="flex-col items-center gap-1" style={{ width: 70 }}>
      {artist.picture_medium ? (
        <Image
          source={{ uri: artist.picture_medium }}
          className="h-16 w-16 rounded-full"
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-full bg-bg-secondary">
          <TextCustom size="l" className="text-accent">
            {(artist.name || '?').charAt(0).toUpperCase()}
          </TextCustom>
        </View>
      )}
      <TextCustom
        size="xs"
        numberOfLines={2}
        ellipsizeMode="tail"
        className="text-center"
        color={themeColors[theme]['text-main']}
        style={{ width: '100%' }}
      >
        {artist.name || ''}
      </TextCustom>
    </View>
  );
};

export default ArtistLabel;

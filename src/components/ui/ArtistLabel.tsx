import { FC } from 'react';
import { Image, View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import type { DeezerArtist } from '@/utils/deezer/deezer-types';

const ArtistLabel: FC<{ artist: DeezerArtist }> = ({ artist }) => {
  const { theme } = useTheme();
  return (
    <View className="flex-col items-center gap-1">
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
        size="s"
        numberOfLines={2}
        style={{
          width: 'auto',
          maxWidth: 80,
          fontFamily: 'Inter',
          textAlign: 'center',
          color: themeColors[theme]['text-main']
        }}
      >
        {artist.name || ''}
      </TextCustom>
    </View>
  );
};

export default ArtistLabel;

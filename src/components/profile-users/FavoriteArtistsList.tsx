import { FC } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import ArtistLabel from '@/components/ui/ArtistLabel';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import type { DeezerArtist } from '@/utils/deezer/deezer-types';

interface FavoriteArtistsListProps {
  artists: DeezerArtist[];
  loading?: boolean;
}

const FavoriteArtistsList: FC<FavoriteArtistsListProps> = ({
  artists,
  loading = false
}) => {
  const { theme } = useTheme();

  if (loading) {
    return (
      <View className="items-center p-4">
        <ActivityIndicator color={themeColors[theme]['primary']} />
        <TextCustom
          color={themeColors[theme]['text-secondary']}
          className="mt-2 animate-pulse text-center"
        >
          Loading favorite artists...
        </TextCustom>
      </View>
    );
  }

  if (!artists || artists.length === 0) {
    return (
      <View className="items-center py-4">
        <TextCustom
          size="s"
          color={themeColors[theme]['text-secondary']}
          className="text-center"
        >
          No favorite artists yet
        </TextCustom>
        <TextCustom
          size="xs"
          color={themeColors[theme]['text-secondary']}
          className="text-center"
        >
          Add artists to your favorites from the Edit Profile screen
        </TextCustom>
      </View>
    );
  }

  return (
    <View className="w-full gap-4 p-4">
      <View className="flex-row items-center justify-between">
        <TextCustom type="semibold" size="xl">
          Favorite Artists
        </TextCustom>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 2
        }}
      >
        {artists.map((artist) => (
          <ArtistLabel key={artist.id} artist={artist} />
        ))}
      </ScrollView>
    </View>
  );
};

export default FavoriteArtistsList;

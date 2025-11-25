import { FC } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import ArtistLabel from '@/components/ui/ArtistLabel';
import { TextCustom } from '@/components/ui/TextCustom';
import type { Artist } from '@/graphql/types-return';
import { useNetwork } from '@/providers/NetworkProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface FavoriteArtistsListProps {
  artists: Artist[];
  loading?: boolean;
  expectedCount?: number; // Number of artist IDs that should be loaded
}

const FavoriteArtistsList: FC<FavoriteArtistsListProps> = ({
  artists,
  loading = false,
  expectedCount = 0
}) => {
  const { theme } = useTheme();
  const { isOnline } = useNetwork();

  const hasArtists = artists && artists.length > 0;

  return (
    <View className="w-full gap-4 p-4">
      {/* Loading state */}
      {loading && (
        <View className="items-center">
          <ActivityIndicator color={themeColors[theme]['primary']} />
          <TextCustom
            color={themeColors[theme]['text-secondary']}
            className="mt-2 animate-pulse text-center"
          >
            Loading favorite artists...
          </TextCustom>
        </View>
      )}

      {/* Server unavailable indicator */}
      {isOnline && !loading && artists.length === 0 && expectedCount > 0 && (
        <View className="rounded-md bg-bg-secondary">
          <TextCustom
            size="s"
            color={themeColors[theme]['intent-warning']}
            className="text-center"
          >
            Unable to load favorite artists. Please check if the server is
            running.
          </TextCustom>
        </View>
      )}

      {/* Empty state */}
      {!loading && !hasArtists && expectedCount === 0 && (
        <View className="items-center">
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
      )}

      {/* Artists list */}
      {!loading && hasArtists && (
        <>
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
            {artists
              .filter(
                (artist): artist is Artist =>
                  artist !== null &&
                  artist !== undefined &&
                  artist.id !== undefined
              )
              .map((artist) => (
                <ArtistLabel key={artist.id} artist={artist} />
              ))}
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default FavoriteArtistsList;

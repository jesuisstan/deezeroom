import React from 'react';
import { Dimensions, FlatList, RefreshControl, View } from 'react-native';

import PlaylistCard from '@/components/playlists/PlaylistCard';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface PlaylistGridProps {
  playlists: Playlist[];
  onPlaylistPress: (playlist: Playlist) => void;
  onPlaylistEdit?: (playlist: Playlist) => void;
  onPlaylistDelete?: (playlist: Playlist) => void;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  userId?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const PlaylistGrid: React.FC<PlaylistGridProps> = ({
  playlists,
  onPlaylistPress,
  onPlaylistEdit,
  onPlaylistDelete,
  showEditButton = false,
  showDeleteButton = false,
  userId,
  refreshing = false,
  onRefresh
}) => {
  const screenWidth = Dimensions.get('window').width;
  const paddingHorizontal = 32; // 16px on each side
  const cardWidth = 160;
  const gap = 12;

  // Calculate how many cards can fit in one row
  const availableWidth = screenWidth - paddingHorizontal;
  const cardsPerRow = Math.floor((availableWidth + gap) / (cardWidth + gap));

  // Create rows of playlists
  const rows: Playlist[][] = [];
  for (let i = 0; i < playlists.length; i += cardsPerRow) {
    rows.push(playlists.slice(i, i + cardsPerRow));
  }

  const renderRow = ({ item: row }: { item: Playlist[] }) => (
    <View className="mb-4 flex-row justify-start gap-2">
      {row.map((playlist) => (
        <PlaylistCard
          key={playlist.id}
          playlist={playlist}
          onPress={onPlaylistPress}
          onEdit={onPlaylistEdit}
          onDelete={onPlaylistDelete}
          showEditButton={showEditButton && playlist.createdBy === userId}
          showDeleteButton={showDeleteButton && playlist.createdBy === userId}
        />
      ))}
      {/* Fill remaining space if row is not full */}
      {row.length < cardsPerRow && <View className="flex-1" />}
    </View>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(_, index) => `row-${index}`}
      renderItem={renderRow}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingBottom: 16,
        paddingTop: 16
      }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default PlaylistGrid;

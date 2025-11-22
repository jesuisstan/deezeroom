import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import { useAudioPlayer } from 'expo-audio';
import { useClient, useQuery } from 'urql';

import AddTrackCard from '@/components/playlists/AddTrackCard';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { LIMIT_DEFAULT } from '@/constants/deezer';
import { GET_POPULAR_TRACKS, SEARCH_TRACKS } from '@/graphql/queries';
import { Track } from '@/graphql/schema';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface AddTracksToPlaylistComponentProps {
  onAddTrack: (track: Track) => void;
  onClose?: () => void;
  currentPlaylistTracks: string[]; // Track IDs already in the playlist
  isVisible?: boolean; // Whether the parent modal is visible
}

const AddTracksToPlaylistComponent: React.FC<
  AddTracksToPlaylistComponentProps
> = ({ onAddTrack, onClose, currentPlaylistTracks, isVisible = true }) => {
  const { theme } = useTheme();
  const client = useClient();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isShowingPopular, setIsShowingPopular] = useState(false);
  const [currentPlayingTrackId, setCurrentPlayingTrackId] = useState<
    string | null
  >(null);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string | null>(
    null
  );

  // Audio player for preview - recreated when URL changes
  const previewPlayer = useAudioPlayer(
    currentPreviewUrl ? { uri: currentPreviewUrl } : undefined
  );

  // Query for search
  const [{ data }, executeSearch] = useQuery({
    query: SEARCH_TRACKS,
    variables: { query: searchQuery, limit: LIMIT_DEFAULT, index: 0 },
    pause: true
  });

  // Handle search results
  useEffect(() => {
    if (!data?.searchTracks) return;

    const { tracks, hasMore: moreAvailable } = data.searchTracks;

    if (currentIndex === 0) {
      setAllTracks(tracks);
    } else {
      setAllTracks((prev) => {
        const existingIds = new Set(prev.map((track) => track.id));
        const newTracks = tracks.filter(
          (track: Track) => !existingIds.has(track.id)
        );
        return [...prev, ...newTracks];
      });
    }

    setHasMore(moreAvailable);
    setIsLoadingMore(false);
  }, [data, currentIndex]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Notifier.shoot({
        type: 'warn',
        title: 'Attention',
        message: 'Enter a search query'
      });
      return;
    }

    setIsSearching(true);
    setCurrentIndex(0);
    setHasMore(false);
    setIsShowingPopular(false); // Switch to search mode

    try {
      await executeSearch({
        requestPolicy: 'network-only',
        variables: { query: searchQuery, limit: LIMIT_DEFAULT, index: 0 }
      });
    } catch (err) {
      Logger.error('Search error:', err);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to search tracks'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadPopular = async () => {
    setIsSearching(true);
    setSearchQuery('');
    setCurrentIndex(0);
    setHasMore(false);
    setIsShowingPopular(true);

    try {
      const result = await client.query(GET_POPULAR_TRACKS, {
        limit: LIMIT_DEFAULT,
        index: 0
      });
      if (result.data?.getPopularTracks) {
        const { tracks, hasMore: moreAvailable } = result.data.getPopularTracks;
        setAllTracks(tracks);
        setHasMore(moreAvailable);
      }
    } catch (err) {
      Logger.error('Error loading popular tracks:', err);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to load popular tracks'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || isSearching) return;

    setIsLoadingMore(true);
    const nextIndex = currentIndex + LIMIT_DEFAULT;

    try {
      let result;
      if (isShowingPopular) {
        // Load more popular tracks
        result = await client.query(GET_POPULAR_TRACKS, {
          limit: LIMIT_DEFAULT,
          index: nextIndex
        });

        if (result.data?.getPopularTracks) {
          const { tracks, hasMore: moreAvailable } =
            result.data.getPopularTracks;

          setAllTracks((prev) => {
            const existingIds = new Set(prev.map((track) => track.id));
            const newTracks = tracks.filter(
              (track: Track) => !existingIds.has(track.id)
            );
            return [...prev, ...newTracks];
          });

          setHasMore(moreAvailable);
          setCurrentIndex(nextIndex);
        }
      } else {
        // Load more search results
        result = await client.query(SEARCH_TRACKS, {
          query: searchQuery,
          limit: LIMIT_DEFAULT,
          index: nextIndex
        });

        if (result.data?.searchTracks) {
          const { tracks, hasMore: moreAvailable } = result.data.searchTracks;

          setAllTracks((prev) => {
            const existingIds = new Set(prev.map((track) => track.id));
            const newTracks = tracks.filter(
              (track: Track) => !existingIds.has(track.id)
            );
            return [...prev, ...newTracks];
          });

          setHasMore(moreAvailable);
          setCurrentIndex(nextIndex);
        }
      }
    } catch (err) {
      Logger.error('Error loading more tracks:', err);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to load more tracks'
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleAddTrack = useCallback(
    async (track: Track) => {
      // Add track in background without closing modal
      try {
        await onAddTrack(track);
      } catch (error) {
        // Error is handled in parent component
        Logger.error('Error in handleAddTrack:', error);
      }
    },
    [onAddTrack]
  );

  const handlePreviewTrack = useCallback(
    async (track: Track) => {
      if (!track.preview) {
        Notifier.shoot({
          type: 'warn',
          title: 'Preview Not Available',
          message: 'Preview is not available for this track'
        });
        return;
      }

      // If clicking on the same track, toggle play/pause
      if (currentPlayingTrackId === track.id) {
        try {
          previewPlayer.pause();
          setCurrentPlayingTrackId(null);
          setCurrentPreviewUrl(null);
        } catch (error) {
          Logger.error('Error stopping preview:', error);
        }
        return;
      }

      try {
        // Stop any current preview
        if (currentPlayingTrackId) {
          await previewPlayer.pause();
        }

        // Set new preview URL
        setCurrentPreviewUrl(track.preview);
        setCurrentPlayingTrackId(track.id);
      } catch (error) {
        Logger.error('Error playing preview:', error);
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: 'Failed to play preview'
        });
        setCurrentPlayingTrackId(null);
        setCurrentPreviewUrl(null);
      }
    },
    [previewPlayer, currentPlayingTrackId]
  );

  // Auto-play when URL changes
  useEffect(() => {
    if (currentPlayingTrackId && currentPreviewUrl && previewPlayer) {
      const playPreview = async () => {
        try {
          await previewPlayer.play();
        } catch (error) {
          Logger.error('Error auto-playing preview:', error);
        }
      };
      // Small delay to ensure player is ready
      const timeoutId = setTimeout(playPreview, 50);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPreviewUrl, currentPlayingTrackId]);

  const isTrackInPlaylist = useCallback(
    (trackId: string) => {
      return currentPlaylistTracks.includes(trackId);
    },
    [currentPlaylistTracks]
  );

  useEffect(() => {
    // Stop preview when modal closes
    if (!isVisible && currentPlayingTrackId) {
      try {
        previewPlayer.pause();
        setCurrentPlayingTrackId(null);
        setCurrentPreviewUrl(null);
      } catch {
        // Ignore errors on cleanup
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  useEffect(() => {
    // Cleanup preview audio when component unmounts
    return () => {
      try {
        previewPlayer.pause();
      } catch {
        // Ignore errors on cleanup
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="mb-8 flex-1">
      {/* Search Bar */}
      <View className="mb-4 flex-row items-center gap-1 px-4">
        <InputCustom
          placeholder="Search tracks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          className="flex-1"
          showClearButton
          onClear={() => setSearchQuery('')}
        />
        <View className="flex-row items-center">
          <IconButton
            accessibilityLabel="Search"
            onPress={handleSearch}
            disabled={isSearching}
            className="h-12 w-12"
          >
            <Feather
              name="search"
              size={18}
              color={
                searchQuery.trim()
                  ? themeColors[theme]['primary']
                  : themeColors[theme]['accent']
              }
            />
          </IconButton>
          <IconButton
            accessibilityLabel="Show Popular Tracks"
            onPress={handleLoadPopular}
            disabled={isSearching}
            className="h-12 w-12"
          >
            <Feather
              name="trending-up"
              size={18}
              color={themeColors[theme]['accent']}
            />
          </IconButton>
        </View>
      </View>

      {/* Results */}
      {isSearching ? (
        <View className="items-center py-8">
          <ActivityIndicator color={themeColors[theme]['primary']} />
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="mt-2"
          >
            Searching...
          </TextCustom>
        </View>
      ) : allTracks.length > 0 ? (
        <View>
          {allTracks.map((track) => (
            <AddTrackCard
              key={track.id}
              track={track}
              isAdded={isTrackInPlaylist(track.id)}
              isPlaying={currentPlayingTrackId === track.id}
              onPreview={handlePreviewTrack}
              onToggleAdd={handleAddTrack}
            />
          ))}

          {/* Load More Button */}
          {hasMore && !isLoadingMore && (
            <View className="mt-2 items-center">
              <RippleButton
                title="More"
                size="sm"
                onPress={handleLoadMore}
                loading={isLoadingMore}
                width={120}
              />
            </View>
          )}

          {/* Loading More Indicator */}
          {isLoadingMore && (
            <View className="items-center py-4">
              <ActivityIndicator
                size="small"
                color={themeColors[theme]['primary']}
              />
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
                className="mt-2 animate-pulse"
              >
                Loading more tracks...
              </TextCustom>
            </View>
          )}
        </View>
      ) : (
        <View className="items-center py-8">
          <Feather
            name="music"
            size={48}
            color={themeColors[theme]['text-secondary']}
          />
          <TextCustom className="mt-4 text-center opacity-70">
            {searchQuery && !isSearching && !isShowingPopular
              ? 'No tracks found'
              : 'Search for tracks or load popular tracks'}
          </TextCustom>
        </View>
      )}
    </View>
  );
};

export default AddTracksToPlaylistComponent;

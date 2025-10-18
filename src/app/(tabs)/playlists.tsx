import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import CreatePlaylistButton from '@/components/playlists/CreatePlaylistButton';
import CreatePlaylistModal from '@/components/playlists/CreatePlaylistModal';
import PlaylistCard from '@/components/playlists/PlaylistCard';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import {
  Playlist,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';

const PlaylistsScreen = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'participating' | 'public'>(
    'my'
  );

  const loadPlaylists = async (tab: 'my' | 'participating' | 'public') => {
    if (!user) return;

    try {
      let playlistsData: Playlist[] = [];

      switch (tab) {
        case 'my':
          playlistsData = await PlaylistService.getUserPlaylists(user.uid);
          break;
        case 'participating':
          playlistsData = await PlaylistService.getUserParticipatingPlaylists(
            user.uid
          );
          break;
        case 'public':
          playlistsData = await PlaylistService.getPublicPlaylists();
          break;
      }

      setPlaylists(playlistsData);
    } catch (error) {
      Logger.error('Error loading playlists:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to load playlists'
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPlaylists(activeTab);
    setIsRefreshing(false);
  };

  const handleTabChange = async (tab: 'my' | 'participating' | 'public') => {
    setActiveTab(tab);
    setIsLoading(true);
    await loadPlaylists(tab);
    setIsLoading(false);
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    // TODO: Navigate to playlist detail screen
    console.log('Navigate to playlist:', playlist.id);
  };

  const handlePlaylistDelete = (playlist: Playlist) => {
    Alert.delete(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
      async () => {
        try {
          await PlaylistService.deletePlaylist(playlist.id);

          // Remove from local state
          setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));

          Notifier.shoot({
            type: 'success',
            title: 'Success',
            message: 'Playlist deleted successfully'
          });
        } catch (error) {
          Logger.error('Error deleting playlist:', error);
          Notifier.shoot({
            type: 'error',
            title: 'Error',
            message: 'Failed to delete playlist'
          });
        }
      }
    );
  };

  const handlePlaylistCreated = (playlistId: string) => {
    // Refresh playlists after creation
    loadPlaylists(activeTab);
  };

  useEffect(() => {
    if (user) {
      loadPlaylists(activeTab);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getTabTitle = (tab: 'my' | 'participating' | 'public') => {
    switch (tab) {
      case 'my':
        return 'My';
      case 'participating':
        return 'Shared';
      case 'public':
        return 'Public';
    }
  };

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor:
          theme === 'dark'
            ? themeColors.dark['bg-main']
            : themeColors.light['bg-main']
      }}
    >
      {/* Sticky Tabs Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor:
            theme === 'dark'
              ? themeColors.dark['bg-main']
              : themeColors.light['bg-main'],
          borderBottomWidth: 1,
          borderBottomColor: themeColors[theme].border,
          shadowColor: themeColors[theme]['bg-inverse'],
          shadowOffset: {
            width: 0,
            height: 2
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4
        }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['my', 'participating', 'public'] as const).map((tab) => (
            <View key={tab} style={{ flex: 1 }}>
              <RippleButton
                title={getTabTitle(tab)}
                size="sm"
                onPress={() => handleTabChange(tab)}
                color={
                  activeTab === tab
                    ? themeColors[theme].primary
                    : themeColors[theme].border
                }
              />
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{
          paddingBottom: 16,
          paddingHorizontal: 16,
          paddingTop: 16,
          gap: 16,
          flexGrow: 1
        }}
      >
        {/* Playlists List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <TextCustom className="opacity-70">Loading...</TextCustom>
          </View>
        ) : playlists.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <MaterialCommunityIcons
              name="playlist-music"
              size={48}
              color={themeColors[theme]['text-secondary']}
            />
            <TextCustom className="mt-4 text-center opacity-70">
              {activeTab === 'my' && 'You have no playlists yet'}
              {activeTab === 'participating' &&
                'You are not participating in any playlists'}
              {activeTab === 'public' && 'No public playlists available'}
            </TextCustom>
            {activeTab === 'my' && (
              <RippleButton
                title="Create First Playlist"
                onPress={() => setShowCreateModal(true)}
                className="mt-4"
              />
            )}
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <CreatePlaylistButton onPress={() => setShowCreateModal(true)} />
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onPress={handlePlaylistPress}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Playlist Modal */}
      {user && (
        <CreatePlaylistModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onPlaylistCreated={handlePlaylistCreated}
          userId={user.uid}
        />
      )}
    </View>
  );
};

export default PlaylistsScreen;

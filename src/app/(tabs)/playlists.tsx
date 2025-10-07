import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import CreatePlaylistModal from '@/components/playlists/CreatePlaylistModal';
import PlaylistCard from '@/components/playlists/PlaylistCard';
import RippleButton from '@/components/ui/buttons/RippleButton';
import Divider from '@/components/ui/Divider';
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

  const handlePlaylistEdit = (playlist: Playlist) => {
    // TODO: Navigate to playlist edit screen
    console.log('Edit playlist:', playlist.id);
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
  }, [user]);

  const getTabTitle = (tab: 'my' | 'participating' | 'public') => {
    switch (tab) {
      case 'my':
        return 'My Playlists';
      case 'participating':
        return 'Participating';
      case 'public':
        return 'Public';
    }
  };

  return (
    <View className="flex-1">
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
          backgroundColor:
            theme === 'dark'
              ? themeColors.dark['bg-main']
              : themeColors.light['bg-main'],
          flexGrow: 1
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <TextCustom type="title">Playlists</TextCustom>
          <RippleButton
            title="Create"
            onPress={() => setShowCreateModal(true)}
            size="sm"
          />
        </View>

        {/* Tabs */}
        <View className="flex-row gap-2">
          {(['my', 'participating', 'public'] as const).map((tab) => (
            <RippleButton
              key={tab}
              title={getTabTitle(tab)}
              variant={activeTab === tab ? 'primary' : 'outline'}
              size="sm"
              onPress={() => handleTabChange(tab)}
              className="flex-1"
            />
          ))}
        </View>

        <Divider />

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
          <View>
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onPress={handlePlaylistPress}
                onEdit={handlePlaylistEdit}
                onDelete={handlePlaylistDelete}
                showEditButton={playlist.createdBy === user?.uid}
                showDeleteButton={playlist.createdBy === user?.uid}
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

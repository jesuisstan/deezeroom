import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import CreatePlaylistButton from '@/components/playlists/CreatePlaylistButton';
import CreatePlaylistModal from '@/components/playlists/CreatePlaylistModal';
import PlaylistCard from '@/components/playlists/PlaylistCard';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import {
  Playlist,
  PlaylistService
} from '@/utils/firebase/firebase-service-playlists';
import { UserProfile } from '@/utils/firebase/firebase-service-user';

const PlaylistsScreen = () => {
  const { theme } = useTheme();
  const { user, profile } = useUser();
  const { currentTrack } = usePlaybackState();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'participating' | 'public'>(
    'my'
  );

  // Add padding when mini player is visible
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  const loadPlaylists = useCallback(
    async (tab: 'my' | 'participating' | 'public') => {
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
    },
    [user]
  );

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

  // Refresh data when screen comes into focus (e.g., after deleting a playlist)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadPlaylists(activeTab);
      }
    }, [user, activeTab, loadPlaylists])
  );

  const getTabTitle = (tab: 'my' | 'participating' | 'public') => {
    switch (tab) {
      case 'my':
        return 'My';
      case 'participating':
        return 'Invited';
      case 'public':
        return 'Public';
    }
  };

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: themeColors[theme]['bg-main']
      }}
    >
      {/* Sticky Tabs Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: themeColors[theme]['bg-tertiary'],
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
        <View className="flex-row gap-4">
          {(['my', 'participating', 'public'] as const).map((tab) => (
            <View key={tab} className="flex-1">
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
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[themeColors[theme]['primary']]}
            tintColor={themeColors[theme]['primary']}
          />
        }
        contentContainerStyle={{
          paddingBottom: 16 + bottomPadding,
          paddingHorizontal: 16,
          paddingTop: 16,
          gap: 16,
          flexGrow: 1
        }}
      >
        {/* Playlists List */}
        {isLoading ? (
          <ActivityIndicatorScreen />
        ) : playlists.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4 py-20">
            <MaterialCommunityIcons
              name="playlist-music"
              size={42}
              color={themeColors[theme]['text-secondary']}
            />
            <TextCustom className="text-center">
              {activeTab === 'my' && 'You have no playlists yet'}
              {activeTab === 'participating' &&
                'You are not participating in any playlists'}
              {activeTab === 'public' && 'No public playlists available'}
            </TextCustom>
            {activeTab === 'my' && (
              <RippleButton
                title="Create First Playlist"
                size="md"
                onPress={() => setShowCreateModal(true)}
              />
            )}
          </View>
        ) : (
          <View
            className="flex-row flex-wrap justify-center gap-2"
            style={containerWidthStyle}
          >
            <CreatePlaylistButton onPress={() => setShowCreateModal(true)} />
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
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
          userData={profile as UserProfile}
        />
      )}
    </View>
  );
};

export default PlaylistsScreen;

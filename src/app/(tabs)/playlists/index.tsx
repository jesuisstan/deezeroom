import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import CreatePlaylistButton from '@/components/playlists/CreatePlaylistButton';
import CreatePlaylistModal from '@/components/playlists/CreatePlaylistModal';
import PlaylistCard from '@/components/playlists/PlaylistCard';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import RippleButton from '@/components/ui/buttons/RippleButton';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Initial load and real-time subscription
  useEffect(() => {
    if (!user) return;

    // Initial load
    loadPlaylists(activeTab);
    setIsLoading(false);

    // Subscribe to real-time updates (only creation/deletion, not track changes)
    let unsubscribe: (() => void) | undefined;

    switch (activeTab) {
      case 'my':
        unsubscribe = PlaylistService.subscribeToUserPlaylists(
          user.uid,
          (updatedPlaylists) => {
            setPlaylists(updatedPlaylists);
          }
        );
        break;
      case 'participating':
        unsubscribe = PlaylistService.subscribeToUserParticipatingPlaylists(
          user.uid,
          (updatedPlaylists) => {
            setPlaylists(updatedPlaylists);
          }
        );
        break;
      case 'public':
        unsubscribe = PlaylistService.subscribeToPublicPlaylists(
          (updatedPlaylists) => {
            setPlaylists(updatedPlaylists);
          }
        );
        break;
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, activeTab, loadPlaylists]);

  // Refresh data when screen comes into focus (e.g., after creating a playlist from another screen)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        // Only reload if needed (subscription handles real-time updates)
        // This ensures fresh data when returning to the screen
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

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) {
      return playlists;
    }

    const query = searchQuery.trim().toLowerCase();
    return playlists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query)
    );
  }, [playlists, searchQuery]);

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

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Search Input */}
          <View>
            <InputCustom
              placeholder="Search playlists..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIconName="search"
              onClear={() => setSearchQuery('')}
            />
          </View>

          {/* Playlists List */}
          {isLoading ? (
            <ActivityIndicatorScreen />
          ) : filteredPlaylists.length === 0 ? (
            <View className="items-center gap-4 pt-8">
              <MaterialCommunityIcons
                name="playlist-music"
                size={42}
                color={themeColors[theme]['text-secondary']}
              />
              <TextCustom className="text-center">
                {searchQuery.trim()
                  ? 'No playlists found matching your search'
                  : activeTab === 'my' && 'You have no playlists yet'}
                {searchQuery.trim()
                  ? ''
                  : activeTab === 'participating' &&
                    'You are not participating in any playlists'}
                {searchQuery.trim()
                  ? ''
                  : activeTab === 'public' && 'No public playlists available'}
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
              {activeTab === 'my' && (
                <CreatePlaylistButton
                  onPress={() => setShowCreateModal(true)}
                />
              )}
              {filteredPlaylists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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

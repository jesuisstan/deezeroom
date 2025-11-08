import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FirestoreError } from 'firebase/firestore';
import { useSharedValue } from 'react-native-reanimated';
import { TabView } from 'react-native-tab-view';
import { useClient } from 'urql';

import { Alert } from '@/components/modules/alert';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import AddTracksButton from '@/components/playlists/AddTracksButton';
import AddTracksToPlaylistComponent from '@/components/playlists/AddTracksToPlaylistComponent';
import CoverTab from '@/components/playlists/CoverTab';
import DraggableTracksList from '@/components/playlists/DraggableTracksList';
import EditPlaylistModal from '@/components/playlists/EditPlaylistModal';
import InfoTab from '@/components/playlists/InfoTab';
import ParticipantsTab from '@/components/playlists/ParticipantsTab';
import UserInviteComponent from '@/components/playlists/UserInviteComponent';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { GET_TRACK } from '@/graphql/queries';
import { Track } from '@/graphql/schema';
import {
  usePlaybackActions,
  usePlaybackState,
  usePlaybackUI
} from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';
import {
  Playlist,
  PlaylistService,
  PlaylistTrackPosition
} from '@/utils/firebase/firebase-service-playlists';
import { UserProfile } from '@/utils/firebase/firebase-service-user';

const EventDetailScreen = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const { currentTrack } = usePlaybackState();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const urqlClient = useClient();

  if (isLoading) {
    return <ActivityIndicatorScreen />;
  }

  if (error || !event) {
    return (
      <View
        className="flex-1 items-center justify-center px-4"
        style={{
          backgroundColor: themeColors[theme]['bg-main']
        }}
      >
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={themeColors[theme]['text-secondary']}
        />
        <TextCustom className="mt-4 text-center opacity-70">
          {error || 'Event not found'}
        </TextCustom>
        <RippleButton
          title="Go Back"
          size="sm"
          onPress={handleBack}
          className="mt-4"
        />
      </View>
    );
  }

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: themeColors[theme]['bg-main']
      }}
    >
      {/* Event Content */}
    </View>
  );
};

export default EventDetailScreen;

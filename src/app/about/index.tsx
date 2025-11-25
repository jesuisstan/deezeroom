import { useMemo, useState } from 'react';
import { Image, Linking, ScrollView, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import BulletList from '@/components/ui/BulletList';
import TabButton from '@/components/ui/buttons/TabButton';
import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants';
import { getGraphQLUrl } from '@/graphql/utils';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';

const AboutScreen = () => {
  const { theme } = useTheme();
  const { currentTrack } = usePlaybackState();
  const [activeTab, setActiveTab] = useState<'about' | 'developers'>('about');

  const graphQLUrl = getGraphQLUrl();

  // Add padding when mini player is visible
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0;
  }, [currentTrack]);

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  };

  const renderAboutContent = () => (
    <View className="gap-6">
      {/* Project Overview */}
      <View className="gap-3">
        <View className="items-center">
          <Image
            source={
              theme === 'dark'
                ? require('@/assets/images/logo/logo-text-white-bg-transparent.png')
                : require('@/assets/images/logo/logo-text-black-bg-transparent.png')
            }
            style={{ height: 60, width: 280 }}
            resizeMode="contain"
          />
        </View>
        <TextCustom
          size="m"
          color={themeColors[theme]['text-main']}
          type="italic"
          className="text-center"
        >
          A complete mobile solution focused on music and collaborative user
          experience
        </TextCustom>
      </View>

      <Divider />

      {/* Educational Project Notice */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="school"
            size={24}
            color={themeColors[theme]['primary']}
          />
          <TextCustom
            type="bold"
            size="xl"
            color={themeColors[theme]['text-main']}
          >
            Educational Project
          </TextCustom>
        </View>
        <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
          This is a strictly educational project from École 42, a tuition-free
          computer programming school. The project serves academic purposes and
          is designed to teach modern mobile development practices.
        </TextCustom>
        <TextCustom
          size="m"
          color={themeColors[theme]['primary']}
          type="link"
          onPress={() => handleLinkPress('https://42.fr/en/homepage/')}
        >
          Learn more about École 42 →
        </TextCustom>
      </View>

      <Divider />

      {/* Deezer API Attribution */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="api"
            size={24}
            color={themeColors[theme]['primary']}
          />
          <TextCustom
            type="bold"
            size="xl"
            color={themeColors[theme]['text-main']}
          >
            Music Data Source
          </TextCustom>
        </View>
        <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
          DEEZERoom uses the open Deezer API to load track and artist
          information. Due to the free tier of the API, only track previews are
          available (30 seconds). All music data and metadata are provided by
          Deezer with full respect to their terms of service.
        </TextCustom>
        <TextCustom size="s" color={themeColors[theme]['intent-warning']}>
          This application is not affiliated with, endorsed by, or sponsored by
          Deezer. All trademarks and copyrights belong to their respective
          owners.
        </TextCustom>
        <TextCustom
          size="m"
          color={themeColors[theme]['primary']}
          type="link"
          onPress={() => handleLinkPress('https://developers.deezer.com/')}
        >
          Deezer Developers API →
        </TextCustom>
      </View>

      <Divider />

      {/* Key Features */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="star-four-points"
            size={24}
            color={themeColors[theme]['primary']}
          />
          <TextCustom
            type="bold"
            size="xl"
            color={themeColors[theme]['text-main']}
          >
            Key Features
          </TextCustom>
        </View>

        {/* Events Feature */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons
              name="party-popper"
              size={20}
              color={themeColors[theme]['primary']}
            />
            <TextCustom
              type="semibold"
              size="l"
              color={themeColors[theme]['text-main']}
            >
              Music Track Vote Events
            </TextCustom>
          </View>
          <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
            Create collaborative music events where participants can suggest and
            vote for tracks. The more votes a track gets, the sooner it plays.
          </TextCustom>
          <BulletList
            items={[
              'Real-time voting system',
              'Public and private event modes',
              'Guest access control',
              'Live playlist updates',
              'Event location tracking'
            ]}
            size="m"
          />
        </View>

        {/* Playlists Feature */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons
              name="playlist-music"
              size={20}
              color={themeColors[theme]['primary']}
            />
            <TextCustom
              type="semibold"
              size="l"
              color={themeColors[theme]['text-main']}
            >
              Collaborative Playlists
            </TextCustom>
          </View>
          <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
            Create and edit playlists together with friends in real-time. Share
            musical tastes and build custom radio stations collaboratively.
          </TextCustom>
          <BulletList
            items={[
              'Multi-user real-time editing',
              'Public and private playlists',
              'Participant management',
              'Track search and suggestions',
              'Instant synchronization'
            ]}
            size="m"
          />
        </View>
      </View>

      <Divider />

      {/* Technical Stack */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="code-tags"
            size={24}
            color={themeColors[theme]['primary']}
          />
          <TextCustom
            type="bold"
            size="xl"
            color={themeColors[theme]['text-main']}
          >
            Built With
          </TextCustom>
        </View>
        <BulletList
          items={[
            'React Native & Expo for cross-platform development',
            'Firebase for backend and real-time database',
            'TypeScript for type safety',
            'Deezer API for music data',
            'NativeWind for styling'
          ]}
          size="m"
        />
      </View>

      <Divider />

      {/* Developer & Source Code */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="account-circle"
            size={24}
            color={themeColors[theme]['primary']}
          />
          <TextCustom
            type="bold"
            size="xl"
            color={themeColors[theme]['text-main']}
          >
            Developer
          </TextCustom>
        </View>
        {/*<TextCustom size="m" color={themeColors[theme]['text-secondary']}>
          Developed by Stanislav Krivtsov as part of École 42 curriculum.
        </TextCustom>*/}
        <View className="gap-2">
          {/*<TextCustom size="m" color={themeColors[theme]['text-secondary']}>
            🌐 Portfolio:{' '}
            <TextCustom
              size="m"
              color={themeColors[theme]['primary']}
              type="link"
              onPress={() => handleLinkPress('https://www.krivtsoff.site/')}
            >
              www.krivtsoff.site
            </TextCustom>
          </TextCustom>*/}
          <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
            💻 Source Code:{' '}
            <TextCustom
              size="m"
              color={themeColors[theme]['primary']}
              type="link"
              onPress={() =>
                handleLinkPress('https://github.com/jesuisstan/deezeroom')
              }
            >
              github.com/jesuisstan/deezeroom
            </TextCustom>
          </TextCustom>
        </View>
      </View>

      {/* Footer Note */}
      <View
        className="rounded-md p-4"
        style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
      >
        <TextCustom
          size="s"
          color={themeColors[theme]['text-secondary']}
          type="italic"
        >
          This project is open source and available for educational purposes.
          Feel free to explore the code, learn from it, and contribute!
        </TextCustom>
      </View>
    </View>
  );

  const renderDevelopersContent = () => (
    <View className="gap-6">
      {/* API Overview */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="api"
            size={32}
            color={themeColors[theme]['primary']}
          />
          <TextCustom
            type="bold"
            size="2xl"
            color={themeColors[theme]['text-main']}
          >
            API Reference
          </TextCustom>
        </View>
        <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
          DEEZERoom implements a hybrid backend architecture combining a
          separate Next.js GraphQL API server for music data operations and
          Firebase for real-time collaborative features.
        </TextCustom>
      </View>

      <Divider />

      {/* GraphQL API Section */}
      <View className="gap-4">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="graphql"
            size={28}
            color={themeColors[theme]['primary']}
          />
          <TextCustom
            type="bold"
            size="xl"
            color={themeColors[theme]['text-main']}
          >
            GraphQL API
          </TextCustom>
        </View>

        <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
          Our GraphQL API is hosted on a separate Next.js server and serves as a
          proxy layer for Deezer music data, providing a unified interface for
          track and artist searches.
        </TextCustom>

        {/* Endpoint */}
        <View className="gap-2">
          <TextCustom
            type="semibold"
            size="l"
            color={themeColors[theme]['text-main']}
          >
            Endpoint
          </TextCustom>
          <View
            className="rounded-md p-3"
            style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
          >
            <TextCustom size="m" color={themeColors[theme]['primary']}>
              {graphQLUrl}
            </TextCustom>
          </View>
        </View>

        {/* Available Queries */}
        <View className="gap-3">
          <TextCustom
            type="semibold"
            size="l"
            color={themeColors[theme]['text-main']}
          >
            Available Queries
          </TextCustom>

          {/* searchTracks */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                searchTracks
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                Search for tracks by keyword
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Parameters: query (String!), limit (Int), index (Int)',
                'Returns: SearchTracksResult with tracks array, total count, hasMore flag',
                'Use case: Track search in events and playlists'
              ]}
              size="s"
            />
          </View>

          {/* getPopularTracks */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                getPopularTracks
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                Get trending tracks
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Parameters: limit (Int), index (Int)',
                'Returns: SearchTracksResult',
                'Use case: Homepage recommendations'
              ]}
              size="s"
            />
          </View>

          {/* track */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                track
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                Get track details by ID
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Parameters: id (ID!)',
                'Returns: Track object',
                'Use case: Track detail view, playback'
              ]}
              size="s"
            />
          </View>

          {/* searchArtists */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                searchArtists
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                Search for artists by name
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Parameters: query (String!), limit (Int), index (Int)',
                'Returns: SearchArtistsResult',
                'Use case: Artist preferences, search'
              ]}
              size="s"
            />
          </View>

          {/* artistsByIds */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                artistsByIds
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                Batch fetch artists by IDs
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Parameters: ids ([ID!]!)',
                'Returns: Array of Artist objects',
                'Use case: Loading favorite artists'
              ]}
              size="s"
            />
          </View>
        </View>

        {/* GraphQL Example */}
        <View className="gap-2">
          <TextCustom
            type="semibold"
            size="l"
            color={themeColors[theme]['text-main']}
          >
            Example Query
          </TextCustom>
          <View
            className="rounded-md p-3"
            style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
          >
            <TextCustom
              size="s"
              color={themeColors[theme]['text-secondary']}
              type="italic"
            >
              query SearchTracks {'{'}
              {'\n'}
              {'  '}searchTracks(query: "jazz", limit: 10) {'{'}
              {'\n'}
              {'    '}tracks {'{ id title artist { name } }'}
              {'\n'}
              {'    '}total hasMore{'\n'}
              {'  }'}
              {'\n'}
              {'}'}
            </TextCustom>
          </View>
        </View>

        {/* Live API Examples */}
        <View className="gap-3">
          <TextCustom
            type="semibold"
            size="l"
            color={themeColors[theme]['text-main']}
          >
            Try Live Examples
          </TextCustom>
          <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
            Click on the links below to see live API responses in your browser:
          </TextCustom>

          {/* Search Tracks Example */}
          <View className="gap-1">
            <TextCustom
              size="m"
              color={themeColors[theme]['text-main']}
              type="semibold"
            >
              🎵 Search tracks "jazz":
            </TextCustom>
            <TextCustom
              size="s"
              color={themeColors[theme]['primary']}
              type="link"
              onPress={() =>
                handleLinkPress(
                  `${graphQLUrl}?query={searchTracks(query:"jazz",limit:5){tracks{id title artist{name}}total}}`
                )
              }
            >
              /api/graphql?query={'{'}searchTracks...{'}'}
            </TextCustom>
          </View>

          {/* Popular Tracks Example */}
          <View className="gap-1">
            <TextCustom
              size="m"
              color={themeColors[theme]['text-main']}
              type="semibold"
            >
              🔥 Get popular tracks:
            </TextCustom>
            <TextCustom
              size="s"
              color={themeColors[theme]['primary']}
              type="link"
              onPress={() =>
                handleLinkPress(
                  `${graphQLUrl}?query={getPopularTracks(limit:5){tracks{id title artist{name}album{title}}}}`
                )
              }
            >
              /api/graphql?query={'{'}getPopularTracks...{'}'}
            </TextCustom>
          </View>

          {/* Search Artists Example */}
          <View className="gap-1">
            <TextCustom
              size="m"
              color={themeColors[theme]['text-main']}
              type="semibold"
            >
              🎤 Search artists "daft punk":
            </TextCustom>
            <TextCustom
              size="s"
              color={themeColors[theme]['primary']}
              type="link"
              onPress={() =>
                handleLinkPress(
                  `${graphQLUrl}?query={searchArtists(query:"daft punk",limit:3){artists{id name picture}}}`
                )
              }
            >
              /api/graphql?query={'{'}searchArtists...{'}'}
            </TextCustom>
          </View>

          {/* Track by ID Example */}
          <View className="gap-1">
            <TextCustom
              size="m"
              color={themeColors[theme]['text-main']}
              type="semibold"
            >
              🎧 Get track by ID:
            </TextCustom>
            <TextCustom
              size="s"
              color={themeColors[theme]['primary']}
              type="link"
              onPress={() =>
                handleLinkPress(
                  `${graphQLUrl}?query={track(id:"3135556"){id title duration artist{name}album{title}}}`
                )
              }
            >
              /api/graphql?query={'{'}track(id:"3135556")...{'}'}
            </TextCustom>
          </View>
        </View>

        {/* GraphQL Playground Link */}
        <View
          className="rounded-md p-4"
          style={{
            backgroundColor: themeColors[theme]['primary'] + '15',
            borderWidth: 1,
            borderColor: themeColors[theme]['primary'] + '40'
          }}
        >
          <TextCustom
            size="m"
            color={themeColors[theme]['text-main']}
            type="semibold"
          >
            🚀 GraphQL Playground
          </TextCustom>
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            className="mb-2"
          >
            Interactive API explorer with schema documentation and autocomplete:
          </TextCustom>
          <TextCustom
            size="m"
            color={themeColors[theme]['primary']}
            type="link"
            onPress={() => handleLinkPress(`${graphQLUrl}`)}
          >
            Open GraphQL Playground →
          </TextCustom>
        </View>
      </View>

      <Divider />

      {/* Firebase Backend Section */}
      <View className="gap-4">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="firebase"
            size={28}
            color={themeColors[theme]['primary']}
          />
          <TextCustom
            type="bold"
            size="xl"
            color={themeColors[theme]['text-main']}
          >
            Firebase Backend
          </TextCustom>
        </View>

        <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
          Firebase provides real-time database, authentication, storage, and
          cloud messaging for collaborative features. All services implement
          optimistic updates and conflict resolution.
        </TextCustom>

        {/* Core Services */}
        <View className="gap-3">
          <TextCustom
            type="semibold"
            size="l"
            color={themeColors[theme]['text-main']}
          >
            Core Services
          </TextCustom>

          {/* UserService */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                UserService
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                User authentication and profile management
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Email/password & Google OAuth authentication',
                'Profile CRUD operations with public/private data separation',
                'Email verification flow',
                'Password reset functionality',
                'Avatar upload to Firebase Storage',
                'Favorite artists & tracks management'
              ]}
              size="s"
            />
          </View>

          {/* EventService */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                EventService
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                Music Track Vote events (live voting system)
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Real-time event creation and management',
                'Track voting with optimistic updates',
                'Geofencing with location-based access control',
                'Time window restrictions for voting',
                'Public/private visibility modes',
                'Everyone/invited-only vote licensing',
                'Playback state synchronization',
                'Transaction-based vote counting to prevent conflicts',
                'Participant & invitation management'
              ]}
              size="s"
            />
          </View>

          {/* PlaylistService */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                PlaylistService
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                Collaborative real-time playlist editing
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Multi-user real-time playlist creation',
                'Track add/remove/reorder operations',
                'Conflict resolution with version control',
                'Public/private visibility management',
                'Everyone/invited-only edit permissions',
                'Participant & invitation system',
                'Batch operations with Firestore transactions',
                'Cover image upload support',
                'Playlist metadata (duration, track count)'
              ]}
              size="s"
            />
          </View>

          {/* ConnectionsService */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                ConnectionsService
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                Social connections and friend management
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Friend request system',
                'Connection approval/rejection flow',
                'Bi-directional friend relationships',
                'Real-time connection status updates'
              ]}
              size="s"
            />
          </View>

          {/* NotificationService */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                NotificationService
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                Push notifications via Expo
              </TextCustom>
            </View>
            <BulletList
              items={[
                'Push token management per device',
                'Event invitations',
                'Playlist collaboration invites',
                'Friend requests',
                'System notifications'
              ]}
              size="s"
            />
          </View>

          {/* StorageService */}
          <View className="gap-2">
            <View
              className="rounded-md p-3"
              style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
            >
              <TextCustom
                size="m"
                color={themeColors[theme]['text-main']}
                type="semibold"
              >
                StorageService
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                File storage and management
              </TextCustom>
            </View>
            <BulletList
              items={[
                'User avatar uploads',
                'Event cover images',
                'Playlist cover images',
                'Automatic image optimization',
                'Secure file deletion'
              ]}
              size="s"
            />
          </View>
        </View>

        {/* Data Models */}
        <View className="gap-3">
          <TextCustom
            type="semibold"
            size="l"
            color={themeColors[theme]['text-main']}
          >
            Key Data Models
          </TextCustom>

          <View
            className="rounded-md p-3"
            style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
          >
            <TextCustom
              size="m"
              color={themeColors[theme]['text-main']}
              type="semibold"
            >
              Firestore Collections
            </TextCustom>
          </View>

          <BulletList
            items={[
              'users/ - User profiles with nested private data',
              'public_profiles/ - Public user information',
              'events/ - Music Track Vote events',
              'events/{id}/tracks - Event track subcollection',
              'playlists/ - Collaborative playlists',
              'playlists/{id}/tracks - Playlist track subcollection',
              'connections/ - Friend relationships',
              'notifications/ - User notifications',
              'push_tokens/ - Device push notification tokens'
            ]}
            size="s"
          />
        </View>

        {/* Real-time Features */}
        <View className="gap-3">
          <TextCustom
            type="semibold"
            size="l"
            color={themeColors[theme]['text-main']}
          >
            Real-time Capabilities
          </TextCustom>

          <BulletList
            items={[
              'Firestore real-time listeners for instant updates',
              'Optimistic UI updates for better UX',
              'Transaction-based operations for data consistency',
              'Conflict resolution with version control',
              'Server-side timestamp for synchronization',
              'Push notifications for offline users',
              'Automatic retry mechanisms for failed operations'
            ]}
            size="m"
          />
        </View>

        {/* Security */}
        <View className="gap-3">
          <TextCustom
            type="semibold"
            size="l"
            color={themeColors[theme]['text-main']}
          >
            Security Implementation
          </TextCustom>

          <BulletList
            items={[
              'Firebase Authentication for user identity',
              'Firestore Security Rules for data access control',
              'Server-side validation in Cloud Functions',
              'JWT token-based API authentication',
              'Role-based access control (owner, participant, guest)',
              'Secure file storage with permission checks',
              'Environment variables for sensitive data'
            ]}
            size="m"
          />
        </View>
      </View>

      <Divider />

      {/* Architecture Notes */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="layers"
            size={24}
            color={themeColors[theme]['primary']}
          />
          <TextCustom
            type="bold"
            size="xl"
            color={themeColors[theme]['text-main']}
          >
            Architecture Highlights
          </TextCustom>
        </View>

        <BulletList
          items={[
            'Hybrid approach: GraphQL for read-heavy music data, Firebase for real-time collaboration',
            'Client-server separation: mobile app acts as thin client',
            'Backend as source of truth for all user data',
            'RESTful principles in GraphQL query design',
            'JSON format for all data exchange',
            'Comprehensive error handling and logging',
            'Cross-platform support (iOS, Android, Web)'
          ]}
          size="m"
        />
      </View>

      {/* Footer Note */}
      <View
        className="rounded-md p-4"
        style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
      >
        <TextCustom
          size="s"
          color={themeColors[theme]['text-secondary']}
          type="italic"
        >
          For implementation details, please refer to the source code repository
          on GitHub:{' '}
          <TextCustom
            size="s"
            type="link"
            onPress={() =>
              handleLinkPress('https://github.com/jesuisstan/deezeroom')
            }
          >
            jesuisstan/deezeroom
          </TextCustom>
        </TextCustom>
      </View>
    </View>
  );

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: themeColors[theme]['bg-main']
      }}
    >
      {/* Tabs Header */}
      <View
        className="flex-row gap-2 px-4 py-2 shadow-sm"
        style={{ backgroundColor: themeColors[theme]['primary'] + '20' }}
      >
        <TabButton
          title="About"
          isActive={activeTab === 'about'}
          onPress={() => setActiveTab('about')}
        />
        <TabButton
          title="For Developers"
          isActive={activeTab === 'developers'}
          onPress={() => setActiveTab('developers')}
        />
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{
          paddingBottom: 16 + bottomPadding,
          paddingHorizontal: 16,
          paddingTop: 16
        }}
      >
        <View style={containerWidthStyle}>
          {activeTab === 'about'
            ? renderAboutContent()
            : renderDevelopersContent()}
        </View>
      </ScrollView>
    </View>
  );
};

export default AboutScreen;

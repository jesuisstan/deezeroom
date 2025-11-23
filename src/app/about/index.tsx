import { useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import BulletList from '@/components/ui/BulletList';
import TabButton from '@/components/ui/buttons/TabButton';
import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';

const AboutScreen = () => {
  const { theme } = useTheme();
  const { currentTrack } = usePlaybackState();
  const [activeTab, setActiveTab] = useState<'about' | 'developers'>('about');

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
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="music-circle"
            size={32}
            color={themeColors[theme]['primary']}
          />
          <TextCustom size="2xl" color={themeColors[theme]['text-main']}>
            DEEZERoom
          </TextCustom>
        </View>
        <TextCustom
          size="m"
          color={themeColors[theme]['text-secondary']}
          type="italic"
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
          <TextCustom size="xl" color={themeColors[theme]['text-main']}>
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
          <TextCustom size="xl" color={themeColors[theme]['text-main']}>
            Music Data Source
          </TextCustom>
        </View>
        <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
          DEEZERoom uses the open Deezer API to load track and artist
          information. All music data and metadata are provided by Deezer with
          full respect to their terms of service.
        </TextCustom>
        <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
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
          <TextCustom size="xl" color={themeColors[theme]['text-main']}>
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
            <TextCustom size="l" color={themeColors[theme]['text-main']}>
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
            <TextCustom size="l" color={themeColors[theme]['text-main']}>
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
          <TextCustom size="xl" color={themeColors[theme]['text-main']}>
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
          <TextCustom size="xl" color={themeColors[theme]['text-main']}>
            Developer
          </TextCustom>
        </View>
        <TextCustom size="m" color={themeColors[theme]['text-secondary']}>
          Developed by Stanislav Krivtsov as part of École 42 curriculum.
        </TextCustom>
        <View className="gap-2">
          <TextCustom
            size="m"
            color={themeColors[theme]['primary']}
            type="link"
            onPress={() => handleLinkPress('https://www.krivtsoff.site/')}
          >
            🌐 Portfolio: www.krivtsoff.site
          </TextCustom>
          <TextCustom
            size="m"
            color={themeColors[theme]['primary']}
            type="link"
            onPress={() =>
              handleLinkPress('https://github.com/jesuisstan/deezeroom')
            }
          >
            💻 Source Code: github.com/jesuisstan/deezeroom
          </TextCustom>
        </View>
      </View>

      {/* Footer Note */}
      <View
        className="mt-4 rounded-lg p-4"
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
    <View className="items-center justify-center py-12">
      <MaterialCommunityIcons
        name="code-braces"
        size={64}
        color={themeColors[theme]['text-secondary']}
      />
      <TextCustom
        size="l"
        color={themeColors[theme]['text-secondary']}
        className="mt-4"
      >
        Developer documentation coming soon...
      </TextCustom>
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

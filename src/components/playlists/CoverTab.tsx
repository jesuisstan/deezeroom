import React from 'react';
import { Image, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface CoverTabProps {
  playlist: Playlist;
}

const CoverTab: React.FC<CoverTabProps> = ({ playlist }) => {
  const { theme } = useTheme();

  return (
    <View style={{ width: '100%', aspectRatio: 1 }}>
      {playlist.coverImageUrl ? (
        <Image
          source={{ uri: playlist.coverImageUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: '100%',
            backgroundColor:
              playlist.visibility === 'public'
                ? themeColors[theme].primary
                : themeColors[theme]['intent-success'],
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <View className="items-center justify-center rounded bg-bg-main px-4 shadow-lg">
            <Image
              source={
                theme === 'dark'
                  ? require('@/assets/images/logo/logo-text-white.png')
                  : require('@/assets/images/logo/logo-text-black.png')
              }
              style={{
                maxWidth: '80%',
                height: 80,
                resizeMode: 'contain'
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
};

export default CoverTab;

import React from 'react';
import { Dimensions, Image, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface CoverTabProps {
  playlist: Playlist;
}

const CoverTab: React.FC<CoverTabProps> = ({ playlist }) => {
  const { theme } = useTheme();
  const { width } = Dimensions.get('window');

  return (
    <View style={{ width, height: 200 }}>
      {playlist.coverImageUrl ? (
        <Image
          source={{ uri: playlist.coverImageUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: '100%',
            backgroundColor:
              themeColors[theme as keyof typeof themeColors].primary,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MaterialCommunityIcons
            name="playlist-music"
            size={64}
            color="white"
          />
        </View>
      )}
    </View>
  );
};

export default CoverTab;

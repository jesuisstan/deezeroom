import React from 'react';
import { Dimensions, Image, Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { usePressAnimation } from '@/style/usePressAnimation';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface PlaylistCardProps {
  playlist: Playlist;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    appearAnimation: true,
    appearDelay: 0,
    appearDuration: 800
  });

  const { width } = Dimensions.get('window');
  const cardWidth = Math.min(width / 3.5, 200); // For web compatibility

  const getCardBackgroundColor = () => {
    return playlist.visibility === 'public'
      ? themeColors[theme].primary
      : themeColors[theme]['intent-success'];
  };

  const handleCardPress = () => {
    router.push(`/(tabs)/playlists/${playlist.id}` as any);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={null}
        style={{
          width: cardWidth,
          height: cardWidth,
          backgroundColor: getCardBackgroundColor(),
          borderRadius: 4,
          shadowColor: themeColors[theme]['bg-inverse'],
          shadowOffset: {
            width: 0,
            height: 2
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          overflow: 'hidden'
        }}
      >
        {/* New Layout: Top half unified, bottom half with cover and icons */}
        <View style={{ flex: 1 }}>
          {/* Top Half - Playlist Name (unified) */}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              paddingHorizontal: 12
              //paddingTop: 4
            }}
          >
            <TextCustom
              type="semibold"
              size="l"
              numberOfLines={2}
              color={themeColors[theme]['text-main']}
              selectable={false}
            >
              {playlist.name}
            </TextCustom>
          </View>

          {/* Bottom Row */}
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {/* Bottom Left - Cover Image */}
            <View
              style={{
                flex: 1,
                overflow: 'hidden',
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }}
            >
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
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <MaterialCommunityIcons
                    name="playlist-music"
                    size={32}
                    color="white"
                  />
                </View>
              )}
            </View>

            {/* Bottom Right - Type Icons (Diagonal Layout) */}
            <View
              style={{
                flex: 1,
                position: 'relative'
              }}
            >
              {/* Visibility Icon - Top Left */}
              <View
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  margin: 4,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MaterialCommunityIcons
                  name={playlist.visibility === 'public' ? 'earth' : 'lock'}
                  size={18}
                  color={themeColors[theme]['white']}
                />
              </View>

              {/* Edit Permissions Icon - Bottom Right */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  //padding: 4,
                  margin: 4,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MaterialCommunityIcons
                  name={
                    playlist.editPermissions === 'everyone'
                      ? 'account-group'
                      : 'account-plus'
                  }
                  size={18}
                  color={themeColors[theme]['white']}
                />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default PlaylistCard;

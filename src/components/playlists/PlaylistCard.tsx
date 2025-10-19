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
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation();

  const { width } = Dimensions.get('window');
  const cardWidth = Math.min((width - 48) / 2, 200); // For web compatibility

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

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
          borderRadius: 8,
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
        {/* 4 Quadrants Layout */}
        <View style={{ flex: 1 }}>
          {/* Top Row */}
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {/* Top Left - Playlist Name */}
            <View
              style={{
                flex: 1,
                justifyContent: 'flex-start',
                paddingLeft: 12,
                paddingTop: 12
              }}
            >
              <TextCustom
                type="subtitle"
                size="xl"
                numberOfLines={2}
                color={themeColors[theme]['text-main']}
                selectable={false}
              >
                {playlist.name}
              </TextCustom>
            </View>

            {/* Top Right - Track Count & Duration */}
            <View
              style={{
                flex: 1,
                alignItems: 'flex-end',
                justifyContent: 'flex-start'
              }}
            >
              <View
                style={{
                  alignItems: 'flex-end',
                  gap: 2,
                  paddingRight: 12,
                  paddingTop: 12
                }}
              >
                <TextCustom size="s" selectable={false}>
                  {playlist.trackCount} tracks
                </TextCustom>
                <TextCustom size="s" selectable={false}>
                  {formatDuration(playlist.totalDuration)}
                </TextCustom>
              </View>
            </View>
          </View>

          {/* Bottom Row */}
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {/* Bottom Left - Cover Image */}
            <View style={{ flex: 1 }}>
              <View
                style={{
                  width: '100%',
                  height: '100%',
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
                      name="music"
                      size={32}
                      color="white"
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Bottom Right - Type & Availability */}
            <View
              style={{
                flex: 1,
                alignItems: 'flex-end',
                justifyContent: 'flex-end'
              }}
            >
              <View
                style={{
                  alignItems: 'flex-end',
                  gap: 4,
                  paddingRight: 12,
                  paddingBottom: 12
                }}
              >
                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4
                  }}
                >
                  <TextCustom size="xs" selectable={false}>
                    {playlist.visibility === 'public' ? 'Public' : 'Private'}
                  </TextCustom>
                </View>
                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4
                  }}
                >
                  <TextCustom size="xs" selectable={false}>
                    {playlist.editPermissions === 'everyone'
                      ? 'All'
                      : 'Invited'}
                  </TextCustom>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default PlaylistCard;

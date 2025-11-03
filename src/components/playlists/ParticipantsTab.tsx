import React, { useMemo } from 'react';
import { Image, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';

interface ParticipantsTabProps {
  playlist: Playlist;
}

const ParticipantsTab: React.FC<ParticipantsTabProps> = ({ playlist }) => {
  const { theme } = useTheme();

  // Separate owner and other participants
  const { owner, otherParticipants } = useMemo(() => {
    if (!playlist?.participants || playlist.participants.length === 0) {
      return { owner: null, otherParticipants: [] };
    }

    // Find owner (by role or createdBy)
    const ownerParticipant =
      playlist.participants.find((p) => p.role === 'owner') ||
      playlist.participants.find((p) => p.userId === playlist.createdBy);

    // Get other participants (excluding owner)
    const others = playlist.participants.filter(
      (p) => p.userId !== ownerParticipant?.userId
    );

    return {
      owner: ownerParticipant || null,
      otherParticipants: others
    };
  }, [playlist]);

  const renderParticipant = (
    participant: {
      userId: string;
      displayName?: string;
      email?: string;
      photoURL?: string;
      role?: string;
    },
    isOwner: boolean = false
  ) => {
    const name = participant.displayName || participant.email || 'Unknown';
    const avatarSize = 42;

    return (
      <View
        key={participant.userId}
        className="flex-row items-center gap-2 p-2"
        style={{
          backgroundColor: themeColors[theme]['bg-main'],
          borderRadius: 12,
          marginBottom: 8
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: themeColors[theme]['bg-secondary'],
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {participant.photoURL ? (
            <Image
              source={{ uri: participant.photoURL }}
              style={{
                width: avatarSize,
                height: avatarSize
              }}
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name="account"
              size={avatarSize * 0.6}
              color={themeColors[theme]['text-secondary']}
            />
          )}
        </View>

        {/* Name and Role */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <TextCustom
              type="semibold"
              size="m"
              color={themeColors[theme]['text-main']}
            >
              {name}
            </TextCustom>
            {isOwner && (
              <MaterialCommunityIcons
                name="crown"
                size={18}
                color={themeColors[theme]['primary']}
              />
            )}
          </View>
          {participant.role && !isOwner && (
            <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
              {participant.role === 'editor' ? 'Editor' : 'Viewer'}
            </TextCustom>
          )}
          {isOwner && (
            <TextCustom
              size="s"
              color={themeColors[theme]['text-secondary']}
              className="mt-1"
            >
              Owner
            </TextCustom>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      className="h-full w-full flex-1"
      style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
      contentContainerStyle={{
        padding: 16,
        gap: 16
      }}
      showsVerticalScrollIndicator={true}
    >
      {/* Owner Section */}
      {owner && (
        <View>
          <TextCustom
            type="bold"
            size="l"
            color={themeColors[theme]['text-main']}
            className="mb-2"
          >
            Owner
          </TextCustom>
          {renderParticipant(owner, true)}
        </View>
      )}

      {/* Other Participants Section */}
      {otherParticipants.length > 0 && (
        <View>
          <TextCustom
            type="bold"
            size="l"
            color={themeColors[theme]['text-main']}
            className="mb-2"
          >
            Participants ({otherParticipants.length})
          </TextCustom>
          {otherParticipants.map((participant) =>
            renderParticipant(participant, false)
          )}
        </View>
      )}

      {/* Empty State */}
      {!owner && otherParticipants.length === 0 && (
        <View className="flex-1 items-center justify-center py-8">
          <MaterialCommunityIcons
            name="account-group"
            size={48}
            color={themeColors[theme]['text-secondary']}
          />
          <TextCustom
            size="m"
            color={themeColors[theme]['text-secondary']}
            className="mt-4 text-center"
          >
            No participants found
          </TextCustom>
        </View>
      )}
    </ScrollView>
  );
};

export default ParticipantsTab;

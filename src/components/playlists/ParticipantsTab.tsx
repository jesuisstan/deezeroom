import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

import UserChip from '@/components/profile-users/UserChip';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { Playlist } from '@/utils/firebase/firebase-service-playlists';
import {
  getPublicProfilesByUserIds,
  type PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';

interface ParticipantsTabProps {
  playlist: Playlist;
}

const ParticipantsTab: React.FC<ParticipantsTabProps> = ({ playlist }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [profilesMap, setProfilesMap] = useState<Map<string, PublicProfileDoc>>(
    new Map()
  );
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  // Fetch public profiles for all participants
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!playlist?.participants || playlist.participants.length === 0) {
        setIsLoadingProfiles(false);
        return;
      }

      setIsLoadingProfiles(true);
      try {
        const userIds = playlist.participants.map((p) => p.userId);
        const profiles = await getPublicProfilesByUserIds(userIds);
        setProfilesMap(profiles);
      } catch (error) {
        console.error('Error fetching participant profiles:', error);
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [playlist?.participants]);

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

  const renderParticipant = (participant: {
    userId: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: Date;
  }) => {
    const profile = profilesMap.get(participant.userId);
    const displayName = profile?.displayName || 'Unknown';
    const photoURL = profile?.photoURL;

    return (
      <UserChip
        key={participant.userId}
        user={{
          uid: participant.userId,
          displayName,
          photoURL
        }}
        onPress={() =>
          router.push({
            pathname: '/users/[id]',
            params: { id: participant.userId }
          })
        }
      />
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
          {isLoadingProfiles ? (
            <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
              Loading...
            </TextCustom>
          ) : (
            <UserChip
              user={{
                uid: owner.userId,
                displayName:
                  profilesMap.get(owner.userId)?.displayName || 'Unknown',
                photoURL: profilesMap.get(owner.userId)?.photoURL
              }}
              onPress={() =>
                router.push({
                  pathname: '/users/[id]',
                  params: { id: owner.userId }
                })
              }
              rightAccessory={
                <MaterialCommunityIcons
                  name="crown"
                  size={18}
                  color={themeColors[theme]['primary']}
                />
              }
            />
          )}
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
            Participants{' '}
            <TextCustom
              type="semibold"
              size="m"
              color={themeColors[theme]['text-secondary']}
            >
              ({otherParticipants.length})
            </TextCustom>
          </TextCustom>
          <View className="flex-row flex-wrap gap-2">
            {otherParticipants.map((participant) => (
              <View
                key={participant.userId}
                className="max-w-[48%] flex-shrink"
              >
                {renderParticipant(participant)}
              </View>
            ))}
          </View>
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

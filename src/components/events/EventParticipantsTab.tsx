import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

import UserChip from '@/components/profile-users/UserChip';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import {
  getPublicProfilesByUserIds,
  type PublicProfileDoc
} from '@/utils/firebase/firebase-service-profiles';

interface EventParticipantsTabProps {
  ownerId: string;
  participantIds: string[];
}

const EventParticipantsTab: React.FC<EventParticipantsTabProps> = ({
  ownerId,
  participantIds
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [profilesMap, setProfilesMap] = useState<Map<string, PublicProfileDoc>>(
    new Map()
  );
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  // Fetch public profiles for owner and all participants
  useEffect(() => {
    const fetchProfiles = async () => {
      const allUserIds = [ownerId, ...participantIds].filter(
        (id, index, self) => self.indexOf(id) === index
      ); // Remove duplicates

      if (allUserIds.length === 0) {
        setIsLoadingProfiles(false);
        return;
      }

      setIsLoadingProfiles(true);
      try {
        const profiles = await getPublicProfilesByUserIds(allUserIds);
        setProfilesMap(profiles);
      } catch (error) {
        console.error('Error fetching participant profiles:', error);
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [ownerId, participantIds]);

  // Filter out owner from participants list
  const otherParticipantIds = useMemo(() => {
    return participantIds.filter((id) => id !== ownerId);
  }, [participantIds, ownerId]);

  const renderParticipant = (userId: string) => {
    const profile = profilesMap.get(userId);
    const displayName = profile?.displayName || 'Unknown';
    const photoURL = profile?.photoURL;

    return (
      <UserChip
        key={userId}
        user={{
          uid: userId,
          displayName,
          photoURL
        }}
        onPress={() =>
          router.push({
            pathname: '/users/[id]',
            params: { id: userId }
          })
        }
      />
    );
  };

  return (
    <ScrollView
      className="h-full w-full flex-1"
      style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      showsVerticalScrollIndicator
    >
      <View>
        <TextCustom
          type="bold"
          size="l"
          color={themeColors[theme]['text-main']}
          className="mb-2"
        >
          Host
        </TextCustom>
        {isLoadingProfiles ? (
          <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
            Loading...
          </TextCustom>
        ) : (
          <UserChip
            user={{
              uid: ownerId,
              displayName: profilesMap.get(ownerId)?.displayName || 'Unknown',
              photoURL: profilesMap.get(ownerId)?.photoURL
            }}
            onPress={() =>
              router.push({
                pathname: '/users/[id]',
                params: { id: ownerId }
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

      {otherParticipantIds.length > 0 ? (
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
              ({otherParticipantIds.length})
            </TextCustom>
          </TextCustom>
          <View className="flex-row flex-wrap gap-2">
            {otherParticipantIds.map((userId) => (
              <View key={userId} className="max-w-[48%] flex-shrink">
                {renderParticipant(userId)}
              </View>
            ))}
          </View>
        </View>
      ) : (
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
            No participants yet
          </TextCustom>
        </View>
      )}
    </ScrollView>
  );
};

export default EventParticipantsTab;

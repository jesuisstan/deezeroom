import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

import UserChip from '@/components/profile-users/UserChip';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface ParticipantView {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

interface EventParticipantsTabProps {
  ownerId: string;
  ownerName: string;
  ownerPhotoURL?: string;
  participants: ParticipantView[];
}

const EventParticipantsTab: React.FC<EventParticipantsTabProps> = ({
  ownerId,
  ownerName,
  ownerPhotoURL,
  participants
}) => {
  const { theme } = useTheme();
  const router = useRouter();

  const participantList = useMemo(() => participants, [participants]);

  const renderParticipant = (participant: ParticipantView) => {
    const name = participant.displayName || participant.email || 'Unknown user';
    return (
      <UserChip
        key={participant.uid}
        user={{
          uid: participant.uid,
          displayName: name,
          photoURL: participant.photoURL
        }}
        onPress={() =>
          router.push({
            pathname: '/users/[id]',
            params: { id: participant.uid }
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
        <UserChip
          user={{
            uid: ownerId,
            displayName: ownerName || 'Unknown',
            photoURL: ownerPhotoURL
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
      </View>

      {participantList.length > 0 ? (
        <View>
          <TextCustom
            type="bold"
            size="l"
            color={themeColors[theme]['text-main']}
            className="mb-2"
          >
            Participants ({participantList.length})
          </TextCustom>
          <View className="flex-row flex-wrap gap-2">
            {participantList.map((participant) => (
              <View key={participant.uid} className="max-w-[48%] flex-shrink">
                {renderParticipant(participant)}
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

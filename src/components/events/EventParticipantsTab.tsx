import React, { useMemo } from 'react';
import { Image, ScrollView, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  ownerName: string;
  ownerPhotoURL?: string;
  participants: ParticipantView[];
}

const AVATAR_SIZE = 42;

const EventParticipantsTab: React.FC<EventParticipantsTabProps> = ({
  ownerName,
  ownerPhotoURL,
  participants
}) => {
  const { theme } = useTheme();

  const participantList = useMemo(() => participants, [participants]);

  const renderParticipant = (participant: ParticipantView, isOwner = false) => {
    const name = participant.displayName || participant.email || 'Unknown user';

    return (
      <View
        key={participant.uid}
        className="flex-row items-center gap-2 p-2"
        style={{
          backgroundColor: themeColors[theme]['bg-main'],
          borderRadius: 6,
          marginBottom: 8
        }}
      >
        <View
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            backgroundColor: themeColors[theme]['bg-secondary'],
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {participant.photoURL ? (
            <Image
              source={{ uri: participant.photoURL }}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
              resizeMode="cover"
            />
          ) : (
            <MaterialCommunityIcons
              name="account"
              size={AVATAR_SIZE * 0.6}
              color={themeColors[theme]['text-secondary']}
            />
          )}
        </View>

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
          <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
            {isOwner ? 'Owner' : 'Participant'}
          </TextCustom>
        </View>
      </View>
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
        {renderParticipant(
          {
            uid: 'owner',
            displayName: ownerName,
            photoURL: ownerPhotoURL
          },
          true
        )}
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
          {participantList.map((participant) => renderParticipant(participant))}
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

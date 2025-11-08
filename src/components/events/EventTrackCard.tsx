import React from 'react';
import { View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { EventTrack } from '@/utils/firebase/firebase-service-events';

interface EventTrackCardProps {
  track: EventTrack;
  hasVoted: boolean;
  canVote: boolean;
  isVoting?: boolean;
  onToggleVote: () => void;
  canManage: boolean;
  onRemoveTrack?: () => void;
}

const EventTrackCard: React.FC<EventTrackCardProps> = ({
  track,
  hasVoted,
  canVote,
  isVoting = false,
  onToggleVote,
  canManage,
  onRemoveTrack
}) => {
  const { theme } = useTheme();

  const renderArtists = () => {
    if (!track.track?.artist) {
      return null;
    }
    return track.track.artist.name;
  };

  return (
    <View
      style={{
        backgroundColor: themeColors[theme]['bg-secondary'],
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: themeColors[theme]['border'],
        gap: 12
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            backgroundColor: `${themeColors[theme]['primary']}20`,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MaterialCommunityIcons
            name="music"
            size={26}
            color={themeColors[theme]['primary']}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextCustom
            type="semibold"
            size="m"
            color={themeColors[theme]['text-main']}
            numberOfLines={1}
          >
            {track.track?.title || 'Unknown title'}
          </TextCustom>
          <TextCustom
            size="xs"
            color={themeColors[theme]['text-secondary']}
            numberOfLines={1}
          >
            {renderArtists() || 'Unknown artist'}
          </TextCustom>
        </View>
        {canManage && onRemoveTrack ? (
          <IconButton
            onPress={onRemoveTrack}
            accessibilityLabel="Remove track from event"
            className="h-9 w-9"
          >
            <MaterialCommunityIcons
              name="delete"
              size={18}
              color={themeColors[theme]['intent-error']}
            />
          </IconButton>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons
            name="vote"
            size={18}
            color={themeColors[theme]['text-secondary']}
          />
          <TextCustom
            size="s"
            color={themeColors[theme]['text-secondary']}
            type="semibold"
          >
            {track.voteCount} vote{track.voteCount === 1 ? '' : 's'}
          </TextCustom>
        </View>

        {canVote ? (
          <RippleButton
            title={hasVoted ? 'Remove vote' : 'Vote'}
            size="sm"
            variant={hasVoted ? 'outline' : 'primary'}
            loading={isVoting}
            disabled={isVoting}
            onPress={onToggleVote}
          />
        ) : (
          <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
            Voting disabled
          </TextCustom>
        )}
      </View>
    </View>
  );
};

export default EventTrackCard;

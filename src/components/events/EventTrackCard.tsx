import React from 'react';
import { Image, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import IconButton from '@/components/ui/buttons/IconButton';
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
  currentUserId?: string;
  onRemoveTrack?: () => void;
  isCurrentlyPlaying?: boolean;
}

const EventTrackCard: React.FC<EventTrackCardProps> = ({
  track,
  hasVoted,
  canVote,
  isVoting = false,
  onToggleVote,
  currentUserId,
  onRemoveTrack,
  isCurrentlyPlaying = false
}) => {
  const { theme } = useTheme();

  const canRemove =
    onRemoveTrack &&
    currentUserId &&
    track.addedBy === currentUserId &&
    track.voteCount === 0;

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
        borderRadius: 6,
        padding: 12,
        borderWidth: 1,
        borderColor: themeColors[theme]['border'],
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
      }}
    >
      {/* Album cover */}
      {track.track?.album?.coverMedium ? (
        <Image
          source={{ uri: track.track.album.coverMedium }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 6
          }}
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 6,
            backgroundColor: `${themeColors[theme]['primary']}20`,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MaterialCommunityIcons
            name="music"
            size={22}
            color={themeColors[theme]['primary']}
          />
        </View>
      )}

      {/* Track info */}
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

      {/* Vote count and actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {canRemove ? (
          <IconButton
            onPress={onRemoveTrack}
            accessibilityLabel="Remove track from event"
            className="h-8 w-8"
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={18}
              color={themeColors[theme]['intent-error']}
            />
          </IconButton>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons
            name="vote"
            size={16}
            color={themeColors[theme]['text-secondary']}
          />
          <TextCustom
            size="xs"
            color={themeColors[theme]['text-secondary']}
            type="semibold"
          >
            {track.voteCount}
          </TextCustom>
        </View>
        {canVote && !isCurrentlyPlaying ? (
          <IconButton
            onPress={onToggleVote}
            accessibilityLabel={hasVoted ? 'Remove vote' : 'Vote'}
            disabled={isVoting}
            className="h-8 w-8"
          >
            <MaterialCommunityIcons
              name={hasVoted ? 'thumb-up' : 'thumb-up-outline'}
              size={18}
              color={themeColors[theme]['primary']}
            />
          </IconButton>
        ) : isCurrentlyPlaying ? (
          <View
            className="flex-row items-center gap-1 rounded px-2 py-1"
            style={{
              backgroundColor: themeColors[theme]['primary'] + '22'
            }}
          >
            <MaterialCommunityIcons
              name="music-note"
              size={14}
              color={themeColors[theme]['primary']}
            />
            <TextCustom
              size="xs"
              type="semibold"
              color={themeColors[theme]['primary']}
            >
              Playing
            </TextCustom>
          </View>
        ) : !canVote ? (
          <TextCustom size="xs" color={themeColors[theme]['text-secondary']}>
            Voting disabled
          </TextCustom>
        ) : null}
      </View>
    </View>
  );
};

export default EventTrackCard;

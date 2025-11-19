import { View } from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { EventStatus } from '@/utils/firebase/firebase-service-events';

const EventStatusIndicator = ({
  eventStatus,
  isUpdatingStatus
}: {
  eventStatus: EventStatus;
  isUpdatingStatus?: boolean;
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        position: 'absolute',
        zIndex: 10,
        left: 12,
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 6,
        paddingVertical: 1,
        paddingHorizontal: 4,
        backgroundColor: themeColors[theme]['bg-secondary'] + '99',
        borderColor: themeColors[theme]['border'],
        borderWidth: 1,
        opacity: isUpdatingStatus ? 0.5 : 1
      }}
    >
      <TextCustom
        size="s"
        type="semibold"
        color={
          eventStatus === 'live'
            ? themeColors[theme]['intent-success']
            : eventStatus === 'ended'
              ? themeColors[theme]['intent-error']
              : themeColors[theme]['intent-warning']
        }
      >
        {isUpdatingStatus
          ? '...'
          : eventStatus.charAt(0).toUpperCase() + eventStatus.slice(1)}
      </TextCustom>
    </View>
  );
};

export default EventStatusIndicator;

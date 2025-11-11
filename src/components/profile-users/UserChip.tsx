import { FC, ReactNode } from 'react';
import { Image, Pressable, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

export type BasicUser = {
  uid: string;
  displayName?: string;
  photoURL?: string;
};

interface UserChipProps {
  user: BasicUser;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  rightAccessory?: ReactNode;
}

const MAX_WIDTH = 250;

const UserChip: FC<UserChipProps> = ({
  user,
  onPress,
  disabled = false,
  className = '',
  rightAccessory
}) => {
  const { theme } = useTheme();

  const backgroundColor = themeColors[theme]['primary'] + '20';
  const textColor = themeColors[theme]['text-secondary'];
  const avatarPlaceholderBg = themeColors[theme]['bg-main'];

  const isPressable = !!onPress && !disabled;
  const overlayOpacity = useSharedValue(0);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value
  }));

  const handlePressIn = () => {
    if (!isPressable) return;
    overlayOpacity.value = withTiming(0.12, { duration: 80 });
  };

  const handlePressOut = () => {
    overlayOpacity.value = withTiming(0, { duration: 120 });
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={!isPressable}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`relative overflow-hidden rounded-full border border-border px-3 py-1 ${className}`}
      style={[
        {
          backgroundColor,
          opacity: isPressable ? 1 : 0.9,
          maxWidth: MAX_WIDTH
        }
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: themeColors[theme]['bg-inverse']
          },
          overlayStyle
        ]}
      />

      <View className="flex-row items-center justify-between gap-2">
        {user.photoURL ? (
          <Image
            source={{ uri: user.photoURL }}
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <View
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: avatarPlaceholderBg }}
          >
            <MaterialCommunityIcons
              name="account"
              size={16}
              color={themeColors[theme]['text-secondary']}
            />
          </View>
        )}

        <View className="flex-shrink">
          <TextCustom
            size="s"
            color={textColor}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user.displayName || 'Unknown User'}
          </TextCustom>
        </View>

        {rightAccessory ? (
          <View className="flex-shrink-0 items-center justify-center">
            {rightAccessory}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

export default UserChip;

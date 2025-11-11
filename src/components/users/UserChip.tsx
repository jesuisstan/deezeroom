import { FC, ReactNode } from 'react';
import { Image, Pressable, StyleProp, View, ViewStyle } from 'react-native';

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
      className={`relative flex-row items-center gap-2 overflow-hidden rounded-full border border-border px-2 py-1 ${className}`}
      style={[
        {
          backgroundColor,
          opacity: isPressable ? 1 : 0.9
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

      <TextCustom
        size="s"
        numberOfLines={1}
        color={textColor}
        className="max-w-[130px]"
      >
        {user.displayName || 'Unknown User'}
      </TextCustom>

      {rightAccessory ? <View className="ml-1">{rightAccessory}</View> : null}
    </Pressable>
  );
};

export default UserChip;

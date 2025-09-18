import { View } from 'react-native';

import { Entypo } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';

import StillNeedHelpBlock from '@/components/auth/need-help/StillNeedHelpBlock';
import BulletList from '@/components/ui/BulletList';
import IconButton from '@/components/ui/buttons/IconButton';
import LineButton from '@/components/ui/buttons/LineButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface AccountCompromisedSectionProps {
  onBackPress: () => void;
}

const AccountCompromisedSection = ({
  onBackPress
}: AccountCompromisedSectionProps) => {
  const { theme } = useTheme();

  const signsToLookOutFor = [
    "Playlists are appearing that weren't created by you",
    "Tracks are appearing in your Favorites that weren't favorited by you",
    'You are unable to log into your account due to an unauthorized password change'
  ];

  const protectAccountSteps = [
    "Update your password once you've logged in",
    'If you suspect that your email address may have been compromised, you can change the email linked to your Deezer account in your settings'
  ];

  return (
    <View className="flex-1 gap-4 px-4 pb-4">
      <View className="self-center">
        <TextCustom type="bold" size="l">
          Account compromised?
        </TextCustom>
      </View>

      {/* Signs to look out for section */}
      <View className="gap-2">
        <View className="flex-row items-center gap-3">
          <View className="h-8 w-8 items-center justify-center">
            <FontAwesome6
              name="user-secret"
              size={20}
              color={themeColors[theme]['text-main']}
            />
          </View>
          <TextCustom type="bold">Signs to look out for:</TextCustom>
        </View>

        <View className="ml-11">
          <BulletList items={signsToLookOutFor} />
        </View>
      </View>

      {/* Protect your account section */}
      <View className="gap-2">
        <View className="flex-row items-center gap-3">
          <View className="h-8 w-8 items-center justify-center">
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={themeColors[theme]['text-main']}
            />
          </View>
          <TextCustom type="bold">Protect your account</TextCustom>
        </View>

        <View className="ml-11">
          <BulletList items={protectAccountSteps} />
        </View>
      </View>

      {/* Still need help section */}
      <StillNeedHelpBlock />

      {/* Back button */}
      <LineButton onPress={onBackPress}>
        <View className="w-full flex-row items-center">
          <IconButton accessibilityLabel="Back" onPress={onBackPress}>
            <Entypo
              name="chevron-thin-left"
              size={25}
              color={themeColors[theme]['text-main']}
            />
          </IconButton>
          <TextCustom type="bold" size="l">
            Back to Help
          </TextCustom>
        </View>
      </LineButton>
    </View>
  );
};

export default AccountCompromisedSection;

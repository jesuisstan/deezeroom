import { FC } from 'react';
import { View } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';

import ButtonCustom from '@/components/ui/ButtonCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { UserProfile } from '@/utils/firebase/firebase-service-user';

interface DeleteAccountSectionProps {
  profile: UserProfile;
}

const DeleteAccountSection: FC<DeleteAccountSectionProps> = ({ profile }) => {
  const { theme } = useTheme();

  return (
    <View>
      <ButtonCustom
        title="Delete my account"
        variant="ghost"
        leftIcon={
          <AntDesign
            name="delete"
            size={24}
            color={themeColors[theme]['text-main']}
          />
        }
        onPress={() => {}}
      />
      <TextCustom className="text-center">
        This action cannot be undone and you will lose all your favorites,
        playlists and personalized recommendations.
      </TextCustom>
    </View>
  );
};

export default DeleteAccountSection;

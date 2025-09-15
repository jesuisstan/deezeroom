import { FC } from 'react';
import { ScrollView, View } from 'react-native';

import ChangePasswordSection from '@/components/profile/ChangePasswordSection';
import ConnectedAccountsSection from '@/components/profile/ConnectedAccountsSection';
import DeleteAccountSection from '@/components/profile/DeleteAccountSection';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import Divider from '@/components/ui/Divider';
import { useUser } from '@/providers/UserProvider';

const ProfileSettingsScreen: FC = () => {
  const { profile } = useUser();

  return !profile ? (
    <ActivityIndicatorScreen />
  ) : (
    <ScrollView className="gap-4 bg-bg-main px-4 py-4">
      <View className="gap-4">
        <ConnectedAccountsSection profile={profile} />
        <Divider />
        <ChangePasswordSection profile={profile} />
        <Divider />
        <DeleteAccountSection profile={profile} />
      </View>
    </ScrollView>
  );
};

export default ProfileSettingsScreen;

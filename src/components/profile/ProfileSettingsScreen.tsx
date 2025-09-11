import { FC } from 'react';
import { View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import ConnectedAccountsSection from '@/components/profile/ConnectedAccountsSection';
import { useUser } from '@/providers/UserProvider';

const ProfileSettingsScreen: FC = () => {
  const { profile } = useUser();

  return (
    <SafeAreaView className="flex-1 bg-bg-main" edges={['top', 'bottom']}>
      <View className="flex-1 p-4">
        <View className="mt-4">
          {profile ? <ConnectedAccountsSection profile={profile} /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ProfileSettingsScreen;

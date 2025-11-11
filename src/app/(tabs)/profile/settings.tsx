import { FC, useMemo } from 'react';
import { Image, ScrollView, View } from 'react-native';

import ChangePasswordSection from '@/components/profile-users/ChangePasswordSection';
import ConnectedAccountsSection from '@/components/profile-users/ConnectedAccountsSection';
import DeleteAccountSection from '@/components/profile-users/DeleteAccountSection';
import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import LineButton from '@/components/ui/buttons/LineButton';
import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { MINI_PLAYER_HEIGHT } from '@/constants/deezer';
import useContactSupport from '@/hooks/useContactSupport';
import { usePlaybackState } from '@/providers/PlaybackProvider';
import { useUser } from '@/providers/UserProvider';
import { containerWidthStyle } from '@/style/container-width-style';

const ProfileSettingsScreen: FC = () => {
  const { profile } = useUser();
  const { handleContactSupport } = useContactSupport();

  // Add padding when mini player is visible
  const { currentTrack } = usePlaybackState();
  const bottomPadding = useMemo(() => {
    return currentTrack ? MINI_PLAYER_HEIGHT : 0; // Mini player height
  }, [currentTrack]);

  return !profile ? (
    <ActivityIndicatorScreen />
  ) : (
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: bottomPadding
      }}
      className="bg-bg-main"
    >
      <View style={containerWidthStyle} className="py-4 ">
        <View className="mb-4 flex-row items-center gap-4 px-4">
          {profile?.photoURL ? (
            <Image
              source={{
                uri: profile.photoURL || 'https://via.placeholder.com/100'
              }}
              className="h-16 w-16 rounded-full"
            />
          ) : (
            <View className="h-16 w-16 items-center justify-center rounded-full border border-border bg-primary">
              <TextCustom type="title">
                {(profile?.displayName || profile?.email || '?')
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </TextCustom>
            </View>
          )}
          <View className="flex-1">
            {profile?.email && <TextCustom>{profile?.email}</TextCustom>}
            {profile?.uid && <TextCustom>User ID: {profile?.uid}</TextCustom>}
          </View>
        </View>
        <Divider />
        <View className="mb-4 mt-4 px-4">
          <ConnectedAccountsSection profile={profile} />
        </View>
        <View className="mb-4">
          <Divider />

          {!profile?.authProviders?.emailPassword?.linked ? null : (
            <>
              <ChangePasswordSection profile={profile} />
              <Divider />
            </>
          )}

          <LineButton onPress={handleContactSupport}>
            <View className="w-full items-start px-4 py-4">
              <TextCustom size="m" type="semibold">
                Contact support
              </TextCustom>
            </View>
          </LineButton>
          <Divider />
        </View>
        <View className="mb-4 px-4">
          <DeleteAccountSection profile={profile} />
        </View>
      </View>
    </ScrollView>
  );
};

export default ProfileSettingsScreen;

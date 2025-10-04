import { FC, useState } from 'react';
import { Pressable, View } from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import SetupPassword from '@/components/profile/SetupPassword';
import IconButton from '@/components/ui/buttons/IconButton';
import ProviderIcon from '@/components/ui/ProviderIcon';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { Alert } from '@/modules/alert';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';
import { UserProfile } from '@/utils/firebase/firebase-service-user';

interface ConnectedAccountsSectionProps {
  profile: UserProfile;
}

const ConnectedAccountsSection: FC<ConnectedAccountsSectionProps> = ({
  profile
}) => {
  const { theme } = useTheme();
  const { linkWithGoogle, unlinkWithGoogle, user } = useUser();
  const [isLinking, setIsLinking] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'recently';
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    return new Date(timestamp).toLocaleDateString();
  };

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    try {
      await linkWithGoogle();
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    Alert.confirm(
      'Unlink Google Account',
      'Are you sure you want to unlink your Google account? You will no longer be able to sign in with Google.',
      async () => {
        // Confirmed - execute unlink
        setIsLinking(true);
        try {
          await unlinkWithGoogle();
        } finally {
          setIsLinking(false);
        }
      }
      // Cancelled - do nothing
    );
  };

  const getProviderDisplayName = (providerId: string) => {
    switch (providerId) {
      case 'google.com':
        return 'Google Account';
      case 'password':
        return 'Email & Password';
      default:
        return providerId;
    }
  };

  const linkedProviders = [];

  if (profile.authProviders?.google?.linked) {
    linkedProviders.push({
      type: 'google' as const,
      ...profile.authProviders.google
    });
  }

  if (profile.authProviders?.emailPassword?.linked) {
    linkedProviders.push({
      type: 'emailPassword' as const,
      ...profile.authProviders.emailPassword
    });
  }

  return linkedProviders?.length > 0 ? (
    <View className="gap-4">
      <TextCustom size="m" type="semibold">
        Connected Accounts
      </TextCustom>
      <>
        {linkedProviders.map((provider, index) => (
          <View key={provider.type} className="flex-row items-center">
            <View className="mr-4">
              <ProviderIcon provider={provider.type} />
            </View>
            <View className="flex-1">
              <TextCustom>
                {getProviderDisplayName(provider.providerId)}
              </TextCustom>
              {provider.email && (
                <TextCustom
                  size="xs"
                  type="bold"
                  color={themeColors[theme]['text-secondary']}
                >
                  {provider.email}
                </TextCustom>
              )}
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                Connected {formatDate(provider.linkedAt)}
              </TextCustom>
            </View>
            {provider.type === 'google' && linkedProviders.length > 1 && (
              <IconButton
                accessibilityLabel="Unlink Google Account"
                onPress={handleUnlinkGoogle}
                className="h-9 w-9 border border-border"
                loading={isLinking}
              >
                <MaterialIcons
                  name="close"
                  size={21}
                  color={themeColors[theme]['text-main']}
                />
              </IconButton>
            )}
          </View>
        ))}

        {linkedProviders.length > 1 && (
          <View className="flex-row items-center gap-2 overflow-hidden rounded-xl bg-bg-tertiary p-2">
            <MaterialIcons
              name="info"
              size={21}
              color={themeColors[theme]['intent-warning']}
            />
            <View className="flex-1">
              <TextCustom size="xs">
                You can sign in using any of these methods
              </TextCustom>
            </View>
          </View>
        )}

        {/* Show link Google button if not linked */}
        {!profile.authProviders?.google?.linked && (
          <Pressable
            onPress={handleLinkGoogle}
            disabled={isLinking}
            className="flex-row items-center rounded-xl border border-dashed border-border p-3"
          >
            <View className="mr-4">
              <ProviderIcon provider="google" loading={isLinking} />
            </View>
            <View className="flex-1">
              <TextCustom>
                {isLinking ? 'Linking...' : 'Link Google Account'}
              </TextCustom>
              <TextCustom size="xs" color={themeColors[theme]['primary']}>
                Connect your Google account
              </TextCustom>
            </View>
            <IconButton
              accessibilityLabel="Link Google Account"
              onPress={handleLinkGoogle}
              backgroundColor={themeColors[theme]['bg-secondary']}
              className="h-9 w-9 border border-border"
              loading={isLinking}
            >
              <MaterialIcons
                name="add"
                size={21}
                color={themeColors[theme]['text-main']}
              />
            </IconButton>
          </Pressable>
        )}

        {/* Show link Email/Password button if not linked */}
        {!profile.authProviders?.emailPassword?.linked && (
          <Pressable
            onPress={() => setShowPasswordModal(true)}
            className="flex-row items-center rounded-xl border border-dashed border-border p-3"
          >
            <View className="mr-4">
              <ProviderIcon provider="emailPassword" loading={isLinking} />
            </View>
            <View className="flex-1">
              <TextCustom>Setup Password</TextCustom>
              <TextCustom size="xs" color={themeColors[theme]['primary']}>
                Enable email/password sign-in
              </TextCustom>
            </View>
            <IconButton
              accessibilityLabel="Setup Password"
              onPress={() => setShowPasswordModal(true)}
              backgroundColor={themeColors[theme]['primary']}
              className="h-9 w-9 border border-border"
              loading={isLinking}
            >
              <MaterialIcons
                name="add"
                size={21}
                color={themeColors[theme]['white']}
              />
            </IconButton>
          </Pressable>
        )}
      </>

      {/* Password Setup Modal */}
      {user?.email && (
        <SwipeModal
          title="Setup Password"
          modalVisible={showPasswordModal}
          setVisible={setShowPasswordModal}
          fade={true}
        >
          <SetupPassword userEmail={user.email} />
        </SwipeModal>
      )}
    </View>
  ) : null;
};

export default ConnectedAccountsSection;

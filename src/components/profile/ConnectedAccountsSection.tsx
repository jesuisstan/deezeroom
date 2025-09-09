import { FC, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import SetupPasswordModal from '@/components/profile/SetupPasswordModal';
import ProviderIcon from '@/components/ui/ProviderIcon';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/utils/color-theme';
import { UserProfile } from '@/utils/firebase-services';

interface ConnectedAccountsSectionProps {
  profile: UserProfile;
}

const ConnectedAccountsSection: FC<ConnectedAccountsSectionProps> = ({
  profile
}) => {
  const { theme } = useTheme();
  const { linkWithGoogle, user } = useUser();
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
    <View className="gap-4 rounded-lg bg-bg-secondary p-4">
      <TextCustom>Connected Accounts</TextCustom>

      <>
        {linkedProviders.map((provider, index) => (
          <View key={provider.type} className="flex-row items-center">
            <View className="mr-3">
              <ProviderIcon provider={provider.type} />
            </View>
            <View className="flex-1">
              <TextCustom>
                {getProviderDisplayName(provider.providerId)}
              </TextCustom>
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                Connected {formatDate(provider.linkedAt)}
              </TextCustom>
            </View>
            <View className="rounded-full bg-intent-success px-2 py-1">
              <TextCustom size="xs">Active</TextCustom>
            </View>
          </View>
        ))}

        {linkedProviders.length > 1 && (
          <View className="flex-row items-center gap-2 overflow-hidden rounded-lg bg-bg-tertiary p-3">
            <MaterialIcons
              name="info"
              size={20}
              color={themeColors[theme]['intent-warning']}
            />
            <View className="flex-1">
              <TextCustom size="xs">
                Your accounts are linked - you can sign in using any of these
                methods
              </TextCustom>
            </View>
          </View>
        )}

        {/* Show link Google button if not linked */}
        {!profile.authProviders?.google?.linked && (
          <TouchableOpacity
            onPress={handleLinkGoogle}
            disabled={isLinking}
            className="flex-row items-center rounded-lg border border-dashed border-border p-3"
          >
            <View className="mr-3">
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
            <MaterialIcons
              name="add"
              size={20}
              color={themeColors[theme]['text-main']}
            />
          </TouchableOpacity>
        )}

        {/* Show link Email/Password button if not linked */}
        {!profile.authProviders?.emailPassword?.linked && (
          <TouchableOpacity
            onPress={() => setShowPasswordModal(true)}
            className="flex-row items-center rounded-lg border border-dashed border-border p-3"
          >
            <View className="mr-3">
              <ProviderIcon provider="emailPassword" loading={isLinking} />
            </View>
            <View className="flex-1">
              <TextCustom>Setup Password</TextCustom>
              <TextCustom size="xs" color={themeColors[theme]['primary']}>
                Enable email/password sign-in
              </TextCustom>
            </View>
            <MaterialIcons
              name="add"
              size={20}
              color={themeColors[theme]['text-main']}
            />
          </TouchableOpacity>
        )}
      </>

      {/* Password Setup Modal */}
      {user?.email && (
        <SetupPasswordModal
          visible={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          userEmail={user.email}
        />
      )}
    </View>
  ) : null;
};

export default ConnectedAccountsSection;

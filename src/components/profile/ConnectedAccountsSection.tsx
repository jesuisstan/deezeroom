import { FC, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import ProviderIcon from '@/components/ui/ProviderIcon';
import { TextCustom } from '@/components/ui/TextCustom';
import { useUser } from '@/providers/UserProvider';
import { UserProfile } from '@/utils/firebase-services';

interface ConnectedAccountsSectionProps {
  profile: UserProfile;
}

const ConnectedAccountsSection: FC<ConnectedAccountsSectionProps> = ({
  profile
}) => {
  const { linkWithGoogle } = useUser();
  const [isLinking, setIsLinking] = useState(false);

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

  return (
    <View className="mb-6">
      <TextCustom type="subtitle">Account Information</TextCustom>

      <View className="mb-4 rounded-lg bg-bg-secondary p-4">
        <TextCustom className="mb-2">Connected Accounts</TextCustom>

        {linkedProviders.length > 0 ? (
          <>
            {linkedProviders.map((provider, index) => (
              <View key={provider.type} className="mb-2 flex-row items-center">
                <View className="mr-3">
                  <ProviderIcon provider={provider.type} />
                </View>
                <View className="flex-1">
                  <TextCustom>
                    {getProviderDisplayName(provider.providerId)}
                  </TextCustom>
                  <TextCustom type="xs">
                    Connected {formatDate(provider.linkedAt)}
                  </TextCustom>
                </View>
                <View className="rounded-full bg-intent-success px-2 py-1">
                  <TextCustom type="xs">Active</TextCustom>
                </View>
              </View>
            ))}

            {linkedProviders.length > 1 && (
              <View className="mt-2 rounded-lg bg-bg-tertiary p-2">
                <TextCustom type="xs">
                  ℹ️ Your accounts are linked - you can sign in using any of
                  these methods
                </TextCustom>
              </View>
            )}

            {/* Show link Google button if not linked */}
            {!profile.authProviders?.google?.linked && (
              <TouchableOpacity
                onPress={handleLinkGoogle}
                disabled={isLinking}
                className="mt-2 flex-row items-center rounded-lg border border-dashed border-gray-300 p-3"
              >
                <View className="mr-3">
                  {isLinking ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <ProviderIcon provider="google" />
                  )}
                </View>
                <View className="flex-1">
                  <TextCustom className="text-accent">
                    {isLinking ? 'Linking...' : 'Link Google Account'}
                  </TextCustom>
                  <TextCustom className="text-xs text-accent">
                    Connect your Google account for easier sign-in
                  </TextCustom>
                </View>
                <TextCustom className="text-xs text-accent">+</TextCustom>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View>
            <TextCustom className="mb-3 text-accent">
              No connected accounts found
            </TextCustom>

            {/* Show link Google button when no accounts are connected */}
            <TouchableOpacity
              onPress={handleLinkGoogle}
              disabled={isLinking}
              className="flex-row items-center rounded-lg border border-dashed border-gray-300 p-3"
            >
              <View className="mr-3">
                {isLinking ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <ProviderIcon provider="google" />
                )}
              </View>
              <View className="flex-1">
                <TextCustom className="text-accent">
                  {isLinking ? 'Linking...' : 'Link Google Account'}
                </TextCustom>
                <TextCustom className="text-xs text-accent">
                  Connect your Google account for easier sign-in
                </TextCustom>
              </View>
              <TextCustom className="text-xs text-accent">+</TextCustom>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default ConnectedAccountsSection;

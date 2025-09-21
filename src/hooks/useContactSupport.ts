import { Alert, Linking } from 'react-native';

import { useUser } from '@/providers/UserProvider';

const SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'contact.web.krivtsoff@gmail.com';

const useContactSupport = () => {
  const { user } = useUser();

  const handleContactSupport = async () => {
    try {
      // Email body with the user information:
      const userInfo = user
        ? `
User ID: ${user.uid}
Email: ${user.email || 'Not provided'}
Display Name: ${user.displayName || 'Not provided'}
`
        : 'User not logged in.';

      const emailBody = `Hello,

I need help with my Deezeroom account.

${userInfo}

The issue description:


`;

      const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=Need Help - Deezeroom Support&body=${encodeURIComponent(emailBody)}`;
      await Linking.openURL(emailUrl);
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert('Error', 'Unable to open email client. Please try again.');
    }
  };

  return { handleContactSupport };
};

export default useContactSupport;

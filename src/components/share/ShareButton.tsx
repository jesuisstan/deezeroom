import React, { useMemo, useState } from 'react';
import { Platform } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

import ShareLinkModal from '@/components/share/ShareLinkModal';
import IconButton from '@/components/ui/buttons/IconButton';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

export type ShareButtonProps = {
  path?: string; // app relative path like "/profile?uid=123"
  url?: string; // absolute url overrides path
  title?: string;
  message?: string;
  accessibilityLabel?: string;
};

const ShareButton = ({
  path,
  url,
  title = 'Share',
  message,
  accessibilityLabel = 'Share'
}: ShareButtonProps) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  const p = path || '/';

  // Get app URL for HTTP links (works everywhere: web, mobile with App Links, fallback to web if app not installed)
  const appUrl = useMemo(() => {
    return (
      process.env.EXPO_PUBLIC_APP_URL ||
      Constants.expoConfig?.extra?.appUrl ||
      (__DEV__ ? 'http://localhost:8081' : 'https://deezeroom.expo.app')
    );
  }, []);

  // HTTP URL for sharing (works everywhere, can be opened in browser)
  const httpUrl = useMemo(() => {
    if (url) return url; // Explicit URL prop takes precedence
    return `${appUrl.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;
  }, [url, appUrl, p]);

  // Deep link URL (deezeroom://) for QR code on native platforms
  // This ensures QR code opens the app directly when scanned on mobile devices
  const deepLinkUrl = useMemo(() => Linking.createURL(p), [p]);

  // QR code URL: use deep link on native platforms (opens app), HTTP URL on web (opens browser)
  const qrUrl = useMemo(() => {
    if (Platform.OS === 'web') {
      // On web, use HTTP URL so QR code can be scanned and opened in browser
      return httpUrl;
    }
    // On native platforms (iOS/Android), use deep link to open app directly
    return deepLinkUrl;
  }, [httpUrl, deepLinkUrl]);

  return (
    <>
      <IconButton
        accessibilityLabel={accessibilityLabel}
        onPress={() => setVisible(true)}
      >
        <AntDesign
          name="share-alt"
          size={22}
          color={themeColors[theme]['text-main']}
        />
      </IconButton>
      <ShareLinkModal
        visible={visible}
        onClose={() => setVisible(false)}
        url={httpUrl}
        qrUrl={qrUrl}
        title={title}
        message={message}
      />
    </>
  );
};

export default ShareButton;

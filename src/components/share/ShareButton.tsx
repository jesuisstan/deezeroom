import React, { useMemo, useState } from 'react';

import AntDesign from '@expo/vector-icons/AntDesign';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

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

  // Web-style URL (used for QR always)
  const webStyleUrl = useMemo(() => Linking.createURL(p), [p]);

  // Sharing URL (Android override unless explicit url prop)
  const shareUrl = useMemo(() => {
    if (url) return url;
    if (Platform.OS === 'android') {
      const base = 'https://deezeroom.expo.app';
      return `${base.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;
    }
    return webStyleUrl;
  }, [url, p, webStyleUrl]);

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
        url={shareUrl}
        qrUrl={webStyleUrl}
        title={title}
        message={message}
      />
    </>
  );
};

export default ShareButton;

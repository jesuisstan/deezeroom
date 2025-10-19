import React, { useMemo, useState } from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as Linking from 'expo-linking';
import IconButton from '@/components/ui/buttons/IconButton';
import ShareLinkModal from '@/components/share/ShareLinkModal';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

export type ShareButtonProps = {
  path?: string; // app relative path like "/profile?uid=123"
  url?: string; // absolute url overrides path
  title?: string;
  message?: string;
  accessibilityLabel?: string;
};

const ShareButton = ({ path, url, title = 'Share', message, accessibilityLabel = 'Share' }: ShareButtonProps) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  const shareUrl = useMemo(() => {
    if (url) return url;
    const p = path || '/';
    return Linking.createURL(p);
  }, [path, url]);

  return (
    <>
      <IconButton accessibilityLabel={accessibilityLabel} onPress={() => setVisible(true)}>
        <AntDesign name="share-alt" size={22} color={themeColors[theme]['text-main']} />
      </IconButton>
      <ShareLinkModal visible={visible} onClose={() => setVisible(false)} url={shareUrl} title={title} message={message} />
    </>
  );
};

export default ShareButton;

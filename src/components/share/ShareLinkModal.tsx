import React, { FC, useMemo, useState } from 'react';
import { Image, Platform, Pressable, Share, View } from 'react-native';

import RippleButton from '@/components/ui/buttons/RippleButton';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

// Universal Share + QR modal for sharing links across the app
// Shows: QR code, link preview text, Share button and Close button

export type ShareLinkModalProps = {
  visible: boolean;
  onClose: () => void;
  url: string;
  qrUrl?: string;
  title?: string;
  message?: string;
};

const ShareLinkModal: FC<ShareLinkModalProps> = ({
  visible,
  onClose,
  url,
  qrUrl,
  title = 'Share',
  message
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const QRCodeImpl = useMemo(() => {
    try {
      // Prefer default export if present
      const mod = require('react-native-qrcode-svg');
      return mod?.default ?? mod;
    } catch {
      return null;
    }
  }, []);

  const qrValue = qrUrl ?? url;

  const qrImgUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}`,
    [qrValue]
  );

  // No overlayStyle needed with SwipeModal

  const handleShare = async () => {
    try {
      await Share.share({
        title,
        message: message ? `${message} ${url}` : url,
        url // iOS prefers url field
      });
    } catch {
      // noop
    }
  };

  const handleCopyWeb = async () => {
    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        (navigator as any).clipboard?.writeText
      ) {
        await (navigator as any).clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  };

  return (
    <SwipeModal
      title={title}
      modalVisible={visible}
      setVisible={(v) => {
        if (!v) onClose();
      }}
      onClose={onClose}
      size="three-quarter"
    >
      <View className="gap-4 px-4 py-4">
        <View className="items-center justify-center gap-2">
          <View>
            {/* QR Code: native component if available, otherwise static image fallback */}
            {QRCodeImpl ? (
              <QRCodeImpl
                value={qrValue}
                size={200}
                backgroundColor={themeColors[theme]['bg-main']}
                color={themeColors[theme]['text-main']}
              />
            ) : (
              <Image
                source={{ uri: qrImgUrl }}
                style={{ width: 200, height: 200 }}
              />
            )}
          </View>
          <TextCustom color={themeColors[theme]['text-secondary']} size="s">
            Scan the QR or use the link below
          </TextCustom>
        </View>

        {/* Link box */}
        <Pressable
          onLongPress={handleCopyWeb}
          onPress={handleCopyWeb}
          className="rounded-xl border border-dashed border-border bg-bg-main p-2"
        >
          <TextCustom className="break-all" selectable>
            {url}
          </TextCustom>
          {Platform.OS === 'web' ? (
            <TextCustom
              size="s"
              className="mt-2"
              color={themeColors[theme]['primary']}
            >
              {copied ? 'Copied!' : 'Tap to copy'}
            </TextCustom>
          ) : null}
        </Pressable>

        {/* Share button */}
        <RippleButton
          title="Send the link"
          variant="outline"
          onPress={handleShare}
          className="w-full"
        />
      </View>
    </SwipeModal>
  );
};

export default ShareLinkModal;

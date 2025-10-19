import React, { FC, useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable, Share, View } from 'react-native';
import { TextCustom } from '@/components/ui/TextCustom';
import IconButton from '@/components/ui/buttons/IconButton';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

// Universal Share + QR modal for sharing links across the app
// Shows: QR code, link preview text, Share button and Close button

export type ShareLinkModalProps = {
  visible: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  message?: string;
};

const ShareLinkModal: FC<ShareLinkModalProps> = ({ visible, onClose, url, title = 'Share', message }) => {
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

  const qrImgUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`,
    [url]
  );

  const overlayStyle = useMemo(
    () =>
      Platform.OS === 'web'
        ? {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)'
          }
        : { backgroundColor: 'rgba(0,0,0,0.5)' },
    []
  );

  const handleShare = async () => {
    try {
      await Share.share({
        title,
        message: message ? `${message} ${url}` : url,
        url // iOS prefers url field
      });
    } catch (e) {
      // noop
    }
  };

  const handleCopyWeb = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-6" style={overlayStyle}>
        <View
          className="w-full max-w-[420px] rounded-2xl bg-bg-secondary p-4"
          style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
        >
          <View className="mb-2 flex-row items-center justify-between">
            <TextCustom type="subtitle">{title}</TextCustom>
            <IconButton accessibilityLabel="Close" onPress={onClose}>
              <AntDesign name="close" size={20} color={themeColors[theme]['text-main']} />
            </IconButton>
          </View>

          <View className="items-center justify-center py-4">
            <View className="rounded-xl border border-border bg-bg-main p-4">
              {/* QR Code: native component if available, otherwise static image fallback */}
              {QRCodeImpl ? (
                <QRCodeImpl value={url} size={200} backgroundColor={themeColors[theme]['bg-main']} color={themeColors[theme]['text-main']} />
              ) : (
                <Image source={{ uri: qrImgUrl }} style={{ width: 200, height: 200 }} />
              )}
            </View>
            <TextCustom className="mt-2 text-accent/60" size="s">Scan the QR or use the link below</TextCustom>
          </View>

          {/* Link box */}
          <Pressable onLongPress={handleCopyWeb} onPress={handleCopyWeb} className="rounded-xl border border-dashed border-border bg-bg-main p-3">
            <TextCustom className="break-all" selectable>{url}</TextCustom>
            {Platform.OS === 'web' ? (
              <TextCustom size="s" className="mt-3 text-accent/60">{copied ? 'Copied!' : 'Tap to copy'}</TextCustom>
            ) : null}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default ShareLinkModal;

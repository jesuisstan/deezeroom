import React, {
  createRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState
} from 'react';
import { Alert as RNAlert, Platform, Pressable, View } from 'react-native';

import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

// Types for alert functionality
export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AlertShowParams = {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
};

export type AlertRef = {
  show: (params: AlertShowParams) => void;
  hide: () => void;
};

type AlertState = AlertShowParams & {
  visible: boolean;
};

const DEFAULTS: AlertState = {
  title: '',
  message: '',
  buttons: [],
  visible: false
};

// Singleton ref for static API access
const alertRef = createRef<AlertRef>();

export const AlertModule = forwardRef<AlertRef>((_, ref) => {
  const { theme } = useTheme();
  const [state, setState] = useState<AlertState>(DEFAULTS);

  const hide = () => {
    setState((prev) => ({ ...prev, visible: false }));
  };

  const show = useCallback((params: AlertShowParams) => {
    const next: AlertState = {
      title: params.title ?? DEFAULTS.title,
      message: params.message ?? DEFAULTS.message,
      buttons: params.buttons ?? DEFAULTS.buttons,
      visible: true
    };

    setState(next);

    // Use native Alert on mobile platforms
    if (Platform.OS !== 'web') {
      const buttonLabels = next.buttons?.map((b) => b.text) || [];
      const buttonCallbacks =
        next.buttons?.map((b) => b.onPress || (() => {})) || [];

      RNAlert.alert(
        next.title || 'Alert',
        next.message || '',
        buttonLabels.map((text, index) => ({
          text,
          style: next.buttons?.[index]?.style || 'default',
          onPress: buttonCallbacks[index]
        }))
      );

      // Auto-hide state for mobile platforms
      setTimeout(hide, 100);
    }
  }, []);

  useImperativeHandle(ref, () => ({ show, hide }), [show]);

  // Expose through singleton ref
  useEffect(() => {
    alertRef.current = { show, hide } as AlertRef;
    return () => {
      alertRef.current = null as unknown as AlertRef;
    };
  }, [show]);

  // Only render web modal
  if (!state.visible || Platform.OS !== 'web') return null;

  const colors = theme === 'dark' ? themeColors.dark : themeColors.light;

  // Helper function to get RippleButton props based on button style
  const getButtonProps = (button: AlertButton) => {
    switch (button.style) {
      case 'destructive':
        return {
          variant: 'primary' as const,
          color: colors['intent-error'],
          title: button.text,
          onPress: () => {
            button.onPress?.();
            hide();
          }
        };
      case 'cancel':
        return {
          variant: 'outline' as const,
          title: button.text,
          onPress: () => {
            button.onPress?.();
            hide();
          }
        };
      default:
        return {
          variant: 'primary' as const,
          color: colors.primary,
          title: button.text,
          onPress: () => {
            button.onPress?.();
            hide();
          }
        };
    }
  };

  return (
    <Pressable
      onPress={hide}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      className="cursor-default"
    >
      <Pressable
        onPress={(e) => e.stopPropagation()}
        className="cursor-default"
      >
        <View
          style={{
            backgroundColor: colors['bg-main'],
            borderRadius: 12,
            padding: 24,
            minWidth: 300,
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 4
            },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 8,
            borderWidth: 1,
            borderColor: colors['border']
          }}
        >
          {/* Title */}
          {state.title && (
            <TextCustom type="bold" size="xl" className="mb-4 text-center">
              {state.title}
            </TextCustom>
          )}

          {/* Message */}
          {state.message && (
            <TextCustom type="default" size="l" className="mb-4 text-center">
              {state.message}
            </TextCustom>
          )}

          {/* Buttons */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent:
                (state.buttons?.length || 0) > 2 ? 'flex-end' : 'space-between',
              gap: 8
            }}
          >
            {(state.buttons || []).map((button, index) => (
              <RippleButton
                key={index}
                variant={getButtonProps(button).variant}
                title={getButtonProps(button).title}
                onPress={getButtonProps(button).onPress}
                size="md"
                className="min-w-20"
                color={getButtonProps(button).color}
                //width="full"
              />
            ))}
          </View>
        </View>
      </Pressable>
    </Pressable>
  );
});

AlertModule.displayName = 'AlertModule';

// Static API for easy usage
export const Alert = {
  show: (params: AlertShowParams) => alertRef.current?.show(params),
  hide: () => alertRef.current?.hide(),

  // Convenience methods
  alert: (title: string, message: string) =>
    alertRef.current?.show({ title, message, buttons: [{ text: 'OK' }] }),

  confirm: (
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) =>
    alertRef.current?.show({
      title,
      message,
      buttons: [
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm, style: 'default' }
      ]
    }),

  delete: (
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) =>
    alertRef.current?.show({
      title,
      message,
      buttons: [
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        { text: 'Delete', onPress: onConfirm, style: 'destructive' }
      ]
    }),

  error: (title: string, message: string) => Alert.alert(title, message)
};

export default AlertModule;

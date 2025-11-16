import React, {
  createRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { Logger } from '@/components/modules/logger/LoggerModule';
import IconButton from '@/components/ui/buttons/IconButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

export type NotifierType = 'success' | 'error' | 'warn' | 'info';
export type NotifierPosition = 'top' | 'center' | 'bottom';

export type NotifierShowParams = {
  title?: string;
  message: string;
  type?: NotifierType;
  position?: NotifierPosition;
  duration?: number; // in ms
  autoHide?: boolean; // default true
  showProgress?: boolean; // default true
};

export type NotifierRef = {
  show: (params: NotifierShowParams) => void;
  hide: () => void;
};

type State = Required<
  Omit<NotifierShowParams, 'duration' | 'autoHide' | 'showProgress'>
> & {
  duration: number;
  autoHide: boolean;
  showProgress: boolean;
  visible: boolean;
};

const DEFAULTS: State = {
  title: '',
  message: '',
  type: 'info',
  position: 'bottom',
  duration: 3000,
  autoHide: true,
  showProgress: false,
  visible: false
};

// Singleton ref to control notifier from static API
const notifierRef = createRef<NotifierRef>();

export const NotifierModule = forwardRef<NotifierRef>((_, ref) => {
  const { theme } = useTheme();
  const [state, setState] = useState<State>(DEFAULTS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const colors = theme === 'dark' ? themeColors.dark : themeColors.light;

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState((prev) => ({ ...prev, visible: false }));
  };

  const startProgress = useCallback(
    (duration: number) => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: false
      }).start();
    },
    [progress]
  );

  const show = useCallback(
    (params: NotifierShowParams) => {
      // clear previous timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const next: State = {
        title: params.title ?? '',
        message: params.message,
        type: params.type ?? DEFAULTS.type,
        position: params.position ?? DEFAULTS.position,
        duration: params.duration ?? DEFAULTS.duration,
        autoHide: params.autoHide ?? DEFAULTS.autoHide,
        showProgress: params.showProgress ?? DEFAULTS.showProgress,
        visible: true
      };

      setState(next);

      if (next.showProgress && next.autoHide) {
        startProgress(next.duration);
      } else {
        progress.setValue(0);
      }

      if (next.autoHide) {
        timerRef.current = setTimeout(hide, next.duration);
      }
    },
    [progress, startProgress]
  );

  useImperativeHandle(ref, () => ({ show, hide }), [show]);

  // Expose through singleton ref
  useEffect(() => {
    notifierRef.current = { show, hide } as NotifierRef;
    return () => {
      notifierRef.current = null as unknown as NotifierRef;
    };
  }, [show]);

  if (!state.visible) return null;

  const getPositionStyle = (): object => {
    switch (state.position) {
      case 'top':
        return { justifyContent: 'flex-start', paddingTop: 40 };
      case 'center':
        return { justifyContent: 'center' };
      case 'bottom':
      default:
        return { justifyContent: 'flex-end', paddingBottom: 40 };
    }
  };

  const bgByType =
    state.type === 'success'
      ? colors['intent-success']
      : state.type === 'error'
        ? colors['intent-error']
        : state.type === 'warn'
          ? colors['intent-warning']
          : colors.primary;

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '0%']
  });

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: 'box-none'
      }}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          ...getPositionStyle()
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '90%',
            zIndex: 999999
          }}
        >
          <View
            style={{
              //backgroundColor: colors['bg-secondary'],
              borderColor: bgByType,
              borderWidth: 1,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 12,
              zIndex: 1,
              minHeight: state.position === 'center' ? '20%' : 'auto',
              justifyContent: 'space-between',
              // 👇 Shadow styles - unified approach
              shadowColor: bgByType,
              shadowOffset: {
                width: 0,
                height: 4
              },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 8, // Increased for Android to ensure visibility
              backgroundColor: themeColors[theme]['primary'],
              opacity: 0.9
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Logo Icon */}
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: themeColors[theme]['text-inverse'],
                  marginRight: 12,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Image
                  source={require('@/assets/images/logo/logo-heart-transparent.png')}
                  style={{
                    width: 20,
                    height: 20
                  }}
                  contentFit="contain"
                />
              </View>
              {/* Text content with title */}
              <View style={{ flex: 1 }}>
                {state.title ? (
                  <TextCustom
                    type="bold"
                    color={themeColors[theme]['text-main']}
                  >
                    {state.title}
                  </TextCustom>
                ) : null}
                <TextCustom
                  type="default"
                  color={themeColors[theme]['text-main']}
                >
                  {state.message}
                </TextCustom>
              </View>
              {/* Close Button */}
              <IconButton
                accessibilityLabel="Close notification"
                className="h-8 w-8"
                onPress={hide}
              >
                <MaterialIcons
                  name="close"
                  size={15}
                  color={themeColors[theme]['text-inverse']}
                />
              </IconButton>
            </View>

            {state.showProgress ? (
              <View
                style={{
                  height: 2,
                  backgroundColor: colors['bg-tertiary'],
                  marginTop: 10,
                  overflow: 'hidden'
                }}
              >
                <Animated.View
                  style={{
                    height: '100%',
                    width: barWidth as any,
                    backgroundColor: bgByType
                  }}
                />
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
});

NotifierModule.displayName = 'NotifierModule';

export const Notifier = {
  show: (params: NotifierShowParams) => notifierRef.current?.show(params),
  hide: () => notifierRef.current?.hide(),

  success: (message: string, position?: NotifierPosition, duration?: number) =>
    notifierRef.current?.show({ message, type: 'success', position, duration }),

  error: (message: string, position?: NotifierPosition, duration?: number) =>
    notifierRef.current?.show({
      message,
      type: 'error',
      position,
      duration,
      autoHide: true
    }),

  info: (message: string, position?: NotifierPosition, duration?: number) =>
    notifierRef.current?.show({ message, type: 'info', position, duration }),

  warn: (message: string, position?: NotifierPosition, duration?: number) =>
    notifierRef.current?.show({ message, type: 'warn', position, duration }),

  // Unified shoot method
  shoot: ({
    title,
    message,
    type = 'info',
    position = 'bottom',
    sticky = false,
    showProgress
  }: NotifierShowParams & { sticky?: boolean }) => {
    const duration = sticky ? 3600000 : undefined; // emulate infinite with long duration
    try {
      notifierRef.current?.show({
        title,
        message,
        type,
        position,
        duration,
        showProgress
      });
    } catch (e) {
      if (Platform.OS === 'web')
        alert(title ? `${title}\n${message}` : message);
      else Logger.error('Toast show error:', e, 'NotifierModule');
    }
  }
};

export default NotifierModule;

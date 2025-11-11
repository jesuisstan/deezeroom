import { forwardRef, useRef, useState } from 'react';
import {
  Platform,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View
} from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import clsx from 'clsx';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

export type InputVariant = 'default' | 'filled' | 'outline';

type InputProps = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIconName?: keyof typeof Feather.glyphMap;
  rightIconName?: keyof typeof Feather.glyphMap;
  variant?: InputVariant;
  className?: string;
  inputClassName?: string;
  showClearButton?: boolean;
  onClear?: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
};

const containerBase = 'w-full';
const inputBase = 'text-base text-text-main px-4 py-3 rounded-md';
const variantStyles: Record<InputVariant, string> = {
  default: 'bg-bg-secondary rounded-md',
  filled: 'bg-bg-secondary rounded-md',
  outline: 'bg-transparent rounded-md'
};

const InputCustom = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    helperText,
    errorText,
    leftIconName,
    rightIconName,
    variant = 'default',
    className,
    inputClassName,
    secureTextEntry,
    showClearButton = true,
    onClear,
    value,
    autoFocus = false,
    onFocus,
    ...props
  },
  ref
) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(autoFocus); // Initialize the focus state
  const { theme } = useTheme();
  const colors = themeColors[theme];
  const internalRef = useRef<TextInput>(null);

  // Normalize the incoming value to ensure a string type for TextInput
  const stringValue = typeof value === 'string' ? value : undefined;

  const showPasswordToggle = secureTextEntry && !rightIconName;
  const showClear =
    showClearButton &&
    typeof stringValue === 'string' &&
    stringValue.length > 0 &&
    !secureTextEntry &&
    !rightIconName;

  const getIconColor = () => {
    if (errorText) return colors['intent-error'];
    if (isFocused) return colors.primary;
    return colors['border'];
  };

  const getBorderColor = () => {
    if (errorText) return colors['intent-error'];
    if (isFocused) return colors.primary;
    return colors.border; // Ordinary state - gray border
  };

  const getBorderWidth = () => {
    return 2; // Constant width to prevent layout shifts when focused
  };

  return (
    <View className={clsx(containerBase, className)}>
      {label ? (
        <TextCustom
          className="mb-2"
          type="bold"
          color={colors['text-secondary']}
        >
          {label}
        </TextCustom>
      ) : null}
      <View
        className={clsx('flex-row items-center', variantStyles[variant])}
        style={[
          {
            borderColor: getBorderColor(),
            borderWidth: getBorderWidth()
          },
          Platform.OS === 'web' ? ({ cursor: 'text' } as any) : {}
        ]}
        {...(Platform.OS === 'web'
          ? {
              onStartShouldSetResponder: () => true,
              onResponderGrant: () => {
                // Focus the input when the container is clicked on web
                if (internalRef.current) {
                  internalRef.current.focus();
                }
              },
              onMouseDown: () => {
                // Additional web-specific handling
                setTimeout(() => {
                  if (internalRef.current) {
                    internalRef.current.focus();
                  }
                }, 0);
              }
            }
          : {})}
      >
        {leftIconName ? (
          <View className="pl-3">
            <Feather name={leftIconName} size={18} color={getIconColor()} />
          </View>
        ) : null}
        <TextInput
          ref={(inputRef) => {
            // Handle both internal and forwarded refs
            internalRef.current = inputRef;
            if (typeof ref === 'function') {
              ref(inputRef);
            } else if (ref) {
              ref.current = inputRef;
            }
          }}
          value={stringValue}
          placeholderTextColor={colors['text-disabled']}
          className={clsx(inputBase, 'flex-1', inputClassName)}
          style={[
            { color: colors['text-main'] },
            Platform.OS === 'web'
              ? ({
                  outline: 'none',
                  cursor: 'text',
                  userSelect: 'text'
                } as any)
              : undefined
          ]}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
          // Enforce better defaults for password fields across platforms
          autoCapitalize={
            props.autoCapitalize ??
            (secureTextEntry ? ('none' as any) : undefined)
          }
          autoCorrect={
            props.autoCorrect ?? (secureTextEntry ? false : undefined)
          }
          textContentType={
            (props.textContentType as any) ??
            (secureTextEntry ? ('password' as any) : undefined)
          }
          autoComplete={
            // types vary across platforms; cast to any for compatibility
            ((props as any).autoComplete as any) ??
            (secureTextEntry ? ('password' as any) : undefined)
          }
          {...props}
        />
        {showPasswordToggle ? (
          <TouchableOpacity
            className="py-1 pr-3"
            onPress={() => setIsPasswordVisible((v) => !v)}
            onPressIn={
              Platform.OS === 'web' ? (e) => e.stopPropagation() : undefined
            }
          >
            <Feather
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={18}
              color={getIconColor()}
            />
          </TouchableOpacity>
        ) : showClear ? (
          <TouchableOpacity
            className="py-1 pr-3"
            onPress={() => {
              if (onClear) {
                onClear();
              } else if (props.onChangeText) {
                // Fallback: if onClear is not provided, clear through onChangeText
                (props.onChangeText as (text: string) => void)('');
              }
            }}
            onPressIn={
              Platform.OS === 'web' ? (e) => e.stopPropagation() : undefined
            }
          >
            <Feather name="x-circle" size={18} color={getIconColor()} />
          </TouchableOpacity>
        ) : rightIconName ? (
          <View className="pr-3">
            <Feather name={rightIconName} size={18} color={getIconColor()} />
          </View>
        ) : null}
      </View>
      {errorText ? (
        <TextCustom className="mt-1" size="xs" color={colors['intent-error']}>
          {errorText}
        </TextCustom>
      ) : helperText ? (
        <TextCustom className="mt-1" size="xs" color={colors['accent']}>
          {helperText}
        </TextCustom>
      ) : null}
    </View>
  );
});

export default InputCustom;

import { forwardRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View
} from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import clsx from 'clsx';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

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
};

const containerBase = 'w-full';
const inputBase = 'text-base text-text-main px-4 py-3 rounded-xl';
const variantStyles: Record<InputVariant, string> = {
  default: 'bg-bg-secondary rounded-xl',
  filled: 'bg-bg-secondary rounded-xl',
  outline: 'bg-transparent rounded-xl'
};

const Input = forwardRef<TextInput, InputProps>(function Input(
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
    ...props
  },
  ref
) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(autoFocus); // Инициализируем состояние фокуса
  const { theme } = useTheme();
  const colors = themeColors[theme];

  // Нормализуем входящее значение, чтобы гарантировать строковый тип для TextInput
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
    return colors['text-secondary'];
  };

  const getBorderColor = () => {
    if (errorText) return colors['intent-error'];
    if (isFocused) return colors.primary;
    return colors.border; // Ordinary state - gray border
  };

  const getBorderWidth = () => {
    if (errorText || isFocused) return 2;
    return 1;
  };

  return (
    <View className={clsx(containerBase, className)}>
      {label ? (
        <TextCustom type="bold" className="mb-2 opacity-80">
          {label}
        </TextCustom>
      ) : null}
      <View
        className={clsx('flex-row items-center', variantStyles[variant])}
        style={{
          borderColor: getBorderColor(),
          borderWidth: getBorderWidth()
        }}
      >
        {leftIconName ? (
          <View className="pl-3">
            <Feather name={leftIconName} size={18} color={getIconColor()} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          value={stringValue}
          placeholderTextColor={colors['text-disabled']}
          className={clsx(inputBase, 'flex-1', inputClassName)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
          {...props}
        />
        {showPasswordToggle ? (
          <TouchableOpacity
            className="py-1 pr-3"
            onPress={() => setIsPasswordVisible((v) => !v)}
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
            onPress={() => onClear && onClear()}
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
        <TextCustom className="mt-1 text-intent-error">{errorText}</TextCustom>
      ) : helperText ? (
        <TextCustom className="mt-1 opacity-70">{helperText}</TextCustom>
      ) : null}
    </View>
  );
});

export default Input;

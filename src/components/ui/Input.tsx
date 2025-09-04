import { forwardRef, useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

import Feather from '@expo/vector-icons/Feather';
import clsx from 'clsx';

import { TextCustom } from '@/components/ui/TextCustom';

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
};

const containerBase = 'w-full';
const inputBase = 'text-base text-text px-4 py-3 rounded-xl';
const variantStyles: Record<InputVariant, string> = {
  default: 'bg-backgroundSecondary',
  filled: 'bg-secondary',
  outline: 'bg-transparent border border-border'
};

const iconColor = '#ffffff';

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
    ...props
  },
  ref
) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const showPasswordToggle = secureTextEntry && !rightIconName;

  return (
    <View className={clsx(containerBase, className)}>
      {label ? (
        <TextCustom type="bold" className="mb-2 opacity-80">
          {label}
        </TextCustom>
      ) : null}
      <View
        className={clsx(
          'flex-row items-center rounded-xl',
          variantStyles[variant]
        )}
      >
        {leftIconName ? (
          <View className="pl-3">
            <Feather name={leftIconName} size={18} color={iconColor} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={'#999999'}
          className={clsx(inputBase, 'flex-1', inputClassName)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...props}
        />
        {showPasswordToggle ? (
          <View
            className="pr-3"
            onTouchEnd={() => setIsPasswordVisible((v) => !v)}
          >
            <Feather
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={18}
              color={iconColor}
            />
          </View>
        ) : rightIconName ? (
          <View className="pr-3">
            <Feather name={rightIconName} size={18} color={iconColor} />
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

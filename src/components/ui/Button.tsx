import { ReactNode } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  View
} from 'react-native';

import clsx from 'clsx';

import { TextCustom } from '@/components/ui/TextCustom';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  textClassName?: string;
  fullWidth?: boolean;
};

const baseClasses = 'flex-row items-center justify-center rounded-md';

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 gap-2',
  md: 'px-5 py-3 gap-2.5',
  lg: 'px-6 py-4 gap-3'
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'bg-transparent border border-border',
  ghost: 'bg-transparent'
};

const textColorByVariant: Record<ButtonVariant, string> = {
  primary: 'text-white font-bold',
  secondary: 'text-text font-bold',
  outline: 'text-text',
  ghost: 'text-text'
};

export default function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className,
  textClassName,
  fullWidth = false
}: ButtonProps) {
  const containerClasses = clsx(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    fullWidth ? 'w-full' : undefined,
    disabled ? 'opacity-60' : 'opacity-100',
    className
  );

  const labelClasses = clsx(
    textColorByVariant[variant],
    size === 'sm' && 'text-base',
    size === 'md' && 'text-lg',
    size === 'lg' && 'text-2xl',
    'font-semibold',
    textClassName
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={containerClasses}
    >
      {leftIcon ? <View className="mr-1.5">{leftIcon}</View> : null}
      {loading ? (
        <ActivityIndicator className={textColorByVariant[variant]} />
      ) : (
        <TextCustom className={labelClasses}>{title}</TextCustom>
      )}
      {rightIcon ? <View className="ml-1.5">{rightIcon}</View> : null}
    </Pressable>
  );
}

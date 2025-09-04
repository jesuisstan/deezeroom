import { ReactNode } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  View
} from 'react-native';

import clsx from 'clsx';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

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

const baseClasses =
  'flex-row items-center justify-center rounded-xl transition-all duration-200';

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-6 py-1.5 gap-2 min-h-[36px]',
  md: 'px-8 py-2 gap-2.5 min-h-[42px]',
  lg: 'px-10 py-3 gap-3 min-h-[48px]'
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:bg-primary/90 hover:bg-primary/95',
  secondary: 'bg-secondary active:bg-secondary/90 hover:bg-secondary/95',
  outline:
    'bg-transparent border border-border active:bg-border/10 hover:bg-border/5',
  ghost: 'bg-transparent active:bg-border/10 hover:bg-border/5'
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
  const { theme } = useTheme();
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
    size === 'sm' && 'text-xs',
    size === 'md' && 'text-s',
    size === 'lg' && 'text-m',
    'font-bold',
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
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary'
              ? themeColors[theme].white
              : themeColors[theme].text
          }
        />
      ) : (
        <TextCustom className={labelClasses}>{title}</TextCustom>
      )}
      {rightIcon ? <View className="ml-1.5">{rightIcon}</View> : null}
    </Pressable>
  );
}

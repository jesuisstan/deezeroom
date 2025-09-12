import { FC } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AntDesign } from '@expo/vector-icons';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface ProviderIconProps {
  provider: 'google' | 'emailPassword';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const ProviderIcon: FC<ProviderIconProps> = ({
  provider,
  size = 'md',
  loading = false
}) => {
  const { theme } = useTheme();
  const colors = themeColors[theme];

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const containerSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  if (provider === 'google') {
    return (
      <View
        className={`${containerSizes[size]} items-center justify-center rounded-full bg-intent-error`}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors['text-inverse']} />
        ) : (
          <AntDesign
            name="google"
            size={iconSizes[size]}
            color={colors['text-inverse']}
          />
        )}
      </View>
    );
  }

  if (provider === 'emailPassword') {
    return (
      <View
        className={`${containerSizes[size]} items-center justify-center rounded-full bg-primary`}
      >
        <AntDesign
          name="mail"
          size={iconSizes[size]}
          color={colors['text-inverse']}
        />
      </View>
    );
  }

  return null;
};

export default ProviderIcon;

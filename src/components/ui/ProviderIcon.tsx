import { FC } from 'react';
import { View } from 'react-native';

import { AntDesign } from '@expo/vector-icons';

interface ProviderIconProps {
  provider: 'google' | 'emailPassword';
  size?: 'sm' | 'md' | 'lg';
}

const ProviderIcon: FC<ProviderIconProps> = ({ provider, size = 'md' }) => {
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
        className={`${containerSizes[size]} items-center justify-center rounded-full bg-red-500`}
      >
        <AntDesign name="google" size={iconSizes[size]} color="white" />
      </View>
    );
  }

  if (provider === 'emailPassword') {
    return (
      <View
        className={`${containerSizes[size]} items-center justify-center rounded-full bg-blue-500`}
      >
        <AntDesign name="mail" size={iconSizes[size]} color="white" />
      </View>
    );
  }

  return null;
};

export default ProviderIcon;

// Constrain content width on web for better readability

import { Platform, ViewStyle } from 'react-native';

export const containerWidthStyle: ViewStyle | undefined =
  Platform.OS === 'web'
    ? { maxWidth: 920, width: '100%', alignSelf: 'center' }
    : undefined;

import { Platform } from 'react-native';

import Constants from 'expo-constants';

/**
 * Get GraphQL API URL based on platform
 * - Web: relative path (works with any domain)
 * - Native: full URL from expo config or env variable
 */
export function getGraphQLUrl(): string {
  if (Platform.OS === 'web') {
    return '/api/graphql';
  }

  // For native, use Constants.expoConfig which has access to build-time env vars
  // Fallback: localhost for dev, production URL otherwise
  const appUrl =
    process.env.EXPO_PUBLIC_APP_URL ||
    Constants.expoConfig?.extra?.appUrl ||
    (__DEV__ ? 'http://localhost:8081' : 'https://deezeroom.expo.app');

  return `${appUrl}/api/graphql`;
}

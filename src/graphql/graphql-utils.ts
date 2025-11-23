import { Platform } from 'react-native';

/**
 * Get GraphQL API URL based on platform
 * - Web: relative path (works with any domain)
 * - Native: full URL from env variable
 */
export function getGraphQLUrl(): string {
  if (Platform.OS === 'web') {
    return '/api/graphql';
  }
  return (
    (process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081') +
    '/api/graphql'
  );
}

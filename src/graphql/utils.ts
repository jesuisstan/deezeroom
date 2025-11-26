import Constants from 'expo-constants';

/**
 * Get GraphQL API URL based on platform and environment
 * - Dev mode: uses EXPO_PUBLIC_SERVER_URL if set, otherwise defaults to http://localhost:3000/api/graphql
 * - Production: uses EXPO_PUBLIC_SERVER_URL (should point to Next.js API server)
 * - All platforms (web, iOS, Android) use the same server URL in production
 */
export function getGraphQLUrl(): string {
  // Get server URL from environment variable or config
  const serverUrl =
    process.env.EXPO_PUBLIC_SERVER_URL ||
    Constants.expoConfig?.extra?.serverUrl;

  // Dev mode: use EXPO_PUBLIC_SERVER_URL if set, otherwise default to localhost
  if (__DEV__) {
    if (serverUrl) {
      // Use custom server URL (e.g., http://10.21.0.161:8080)
      return `${serverUrl}/api/graphql`;
    }
    // Default to localhost for local development
    return 'http://localhost:3000/api/graphql';
  }

  // Production mode: use EXPO_PUBLIC_SERVER_URL for all platforms (web, iOS, Android)
  // This ensures web production also uses the separate Next.js server, not the Expo hosting domain
  if (serverUrl) {
    // EXPO_PUBLIC_SERVER_URL should point to Next.js API server (e.g., https://deezeroom-server.vercel.app)
    // Append /api/graphql to get the GraphQL endpoint
    return `${serverUrl}/api/graphql`;
  }

  // Fallback:
  return 'https://deezeroom-server.vercel.app/api/graphql';
}

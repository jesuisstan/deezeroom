import { Redirect } from 'expo-router';

export default function RootIndex() {
  // This component will redirect to the appropriate screen
  // The actual logic is handled by AuthGuard in DeezeroomApp
  return <Redirect href="/auth" />;
}

import { ReactNode, useEffect } from 'react';

import { useRouter, useSegments } from 'expo-router';

import { useUser } from '@/providers/UserProvider';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, profile, loading, profileLoading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || profileLoading) return; // Don't navigate while loading

    const inAuthGroup = segments[0] === 'auth';
    const onVerifyScreen = inAuthGroup && segments[1] === 'verify-email';

    // Use profile.emailVerified from Firestore instead of user.emailVerified from Firebase Auth
    const isEmailVerified =
      profile?.emailVerified ?? user?.emailVerified ?? false;

    if (!user && !inAuthGroup) {
      // User is not signed in and not in auth group
      router.replace('/auth');
    } else if (user) {
      // User signed in
      if (!isEmailVerified && !onVerifyScreen) {
        router.replace('/auth/verify-email');
      } else if (isEmailVerified && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [user, profile, loading, profileLoading, segments, router]);

  return <>{children}</>;
}

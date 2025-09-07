import { ReactNode, useEffect } from 'react';

import { useRouter, useSegments } from 'expo-router';

import { useUser } from '@/providers/UserProvider';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Don't navigate while loading

    const inAuthGroup = segments[0] === 'auth';

    //console.log(
    //  'AuthGuard - User:',
    //  !!user,
    //  'InAuthGroup:',
    //  inAuthGroup,
    //  'Segments:',
    //  segments
    //);

    if (!user && !inAuthGroup) {
      // User is not signed in and not in auth group
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      // User is signed in but still in auth group
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

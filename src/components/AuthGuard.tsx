import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login if not authenticated
      if (segments[0] === '(main)') {
        router.replace('/(auth)/login');
      }
    }
    
    if (!loading && user) {
      // Redirect to dashboard if authenticated and on auth screens
      if (segments[0] === '(auth)') {
        router.replace('/(main)');
      }
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return null; // Show nothing while loading
  }

  return <>{children}</>;
};
import { Stack } from 'expo-router';
import { AuthGuard } from './components/AuthGuard';
import { RootLayout } from './app/(main)/_layout';

export const Router = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
      <Stack.Screen name="(main)" options={{ presentation: 'card' }} />
    </Stack>
  );
};

// Auth routes
export { AuthGuard };

// Main app routes
export { RootLayout };
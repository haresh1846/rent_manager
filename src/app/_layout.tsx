import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Providers } from '@/providers';
import { MotionPreferenceProvider } from '@/components/useReducedMotionPreference';

export default function RootLayout() {
  return (
    <MotionPreferenceProvider>
      <Providers>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F4F6F3' } }}>
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </Providers>
    </MotionPreferenceProvider>
  );
}

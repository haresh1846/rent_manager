import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export const unstable_settings = { anchor: 'login' };

export default function AuthLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F6F3' }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}

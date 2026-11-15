import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

function usableUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const endpoint = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
    return !endpoint.hostname.startsWith('your-project') &&
      (endpoint.protocol === 'https:' || (local && endpoint.protocol === 'http:'));
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = usableUrl(url) && !!publicKey && !publicKey.startsWith('your-');
export const configurationMessage = 'Cloud accounts need a Supabase connection. You can use the local demo on this device.';

let client: SupabaseClient | undefined;

export function getSupabase() {
  if (!isSupabaseConfigured || !url || !publicKey) throw new Error(configurationMessage);
  client ??= createClient(url, publicKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      detectSessionInUrl: false,
    },
  });
  return client;
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getCurrentSession() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

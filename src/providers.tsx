import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { NativeBaseProvider, extendTheme, ColorModeManager } from 'native-base';
import { useColorMode, useColorModeValue } from 'native-base';
import { ReactNativeAsyncStorage } from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { supabase } from './services/supabase';

// Custom theme
const theme = extendTheme({
  colors: {
    primary: {
      50: '#E6F0FA',
      100: '#CCE0F5',
      200: '#99C2EB',
      300: '#66A3E0',
      400: '#3385D6',
      500: '#0066CC', // Main brand color
      600: '#0052A3',
      700: '#003D7A',
      800: '#002952',
      900: '#001429',
    },
    secondary: {
      500: '#00C896',
    },
    danger: {
      500: '#E03131',
    },
    warning: {
      500: '#F59F00',
    },
    success: {
      500: '#40C057',
    },
  },
  fontConfig: {
    Inter: {
      100: { normal: 'Inter_100Thin' },
      200: { normal: 'Inter_200ExtraLight' },
      300: { normal: 'Inter_300Light' },
      400: { normal: 'Inter_400Regular' },
      500: { normal: 'Inter_500Medium' },
      600: { normal: 'Inter_600SemiBold' },
      700: { normal: 'Inter_700Bold' },
      800: { normal: 'Inter_800ExtraBold' },
      900: { normal: 'Inter_900Black' },
    },
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
    mono: 'Inter',
  },
  config: {
    initialColorMode: 'system',
    useSystemColorMode: true,
  },
});

// Color mode manager for persistence
const colorModeManager: ColorModeManager = {
  get: async () => {
    try {
      const value = await ReactNativeAsyncStorage.getItem('@native-base:color-mode');
      return value ?? 'system';
    } catch (e) {
      return 'system';
    }
  },
  set: async (value) => {
    try {
      await ReactNativeAsyncStorage.setItem('@native-base:color-mode', value);
    } catch (e) {
      // Ignore
    }
  },
};

// Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Auth context
interface AuthContextType {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};

interface ProvidersProps {
  children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { colorMode } = useColorMode();

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthReady(true);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinner} />
      </View>
    );
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <NativeBaseProvider theme={theme} colorModeManager={colorModeManager}>
        <AuthContext.Provider value={{ user, loading: !authReady, signOut }}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthContext.Provider>
      </NativeBaseProvider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#0066CC',
    borderTopColor: 'transparent',
  },
});
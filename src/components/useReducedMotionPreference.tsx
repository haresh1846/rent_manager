import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const MotionPreference = createContext(true);

function browserPreference() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)');
  }
}

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(() => browserPreference()?.matches ?? true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const query = browserPreference();
      if (!query) return;
      const update = () => setReduced(query.matches);
      query.addEventListener('change', update);
      update();
      return () => query.removeEventListener('change', update);
    }

    // A live notification takes precedence over the initial asynchronous reading.
    let acceptInitial = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      acceptInitial = false;
      setReduced(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (acceptInitial) setReduced(value);
    }).catch(() => {});
    return () => {
      acceptInitial = false;
      subscription.remove();
    };
  }, []);

  return <MotionPreference.Provider value={reduced}>{children}</MotionPreference.Provider>;
}

export function useReducedMotionPreference() {
  return useContext(MotionPreference);
}

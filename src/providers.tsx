import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Waiting } from '@/components/ui';

export type LocalWorkspace = 'personal' | 'demo';

type WorkspaceContextValue = {
  workspace: LocalWorkspace;
  selectWorkspace: (value: LocalWorkspace) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const preferenceKey = '@rent-manager/local-workspace/v1';

export function useLocalWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('Open a local workspace first.');
  return context;
}

export function Providers({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<LocalWorkspace | null>(null);

  useEffect(() => {
    let mounted = true;
    // Previous demo sign-ins were previews. Only an explicit local workspace selection carries over.
    AsyncStorage.getItem(preferenceKey)
      .then(value => { if (mounted) setWorkspace(value === 'demo' ? 'demo' : 'personal'); })
      .catch(() => { if (mounted) setWorkspace('personal'); });
    return () => { mounted = false; };
  }, []);

  const selectWorkspace = useCallback(async (value: LocalWorkspace) => {
    try {
      await AsyncStorage.setItem(preferenceKey, value);
    } catch {
      throw new Error('This device could not save the workspace choice. Check your available storage and try again.');
    }
    setWorkspace(value);
  }, []);

  if (workspace === null) return <Waiting />;
  return <WorkspaceContext.Provider value={{ workspace, selectWorkspace }}>{children}</WorkspaceContext.Provider>;
}

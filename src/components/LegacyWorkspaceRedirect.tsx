import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useLocalWorkspace } from '@/providers';
import { Action, Card, Notice, Page, Waiting } from './ui';

export default function LegacyWorkspaceRedirect() {
  const { workspace, selectWorkspace } = useLocalWorkspace();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (workspace === 'personal') return;
    let active = true;
    selectWorkspace('personal').catch((cause: Error) => {
      if (active) setError(cause.message);
    });
    return () => { active = false; };
  }, [workspace, selectWorkspace, attempt]);
  if (workspace === 'personal') return <Redirect href="/" />;
  if (error) return <Page narrow><Card><Notice tone="error">{error}</Notice>
    <Action label="Open personal workspace" onPress={() => { setError(''); setAttempt(attempt + 1); }} />
  </Card></Page>;
  return <Waiting />;
}

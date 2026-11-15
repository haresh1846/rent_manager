import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Action, Badge, Body, Card, Header, Notice, Page, SectionTitle, styles } from '@/components/ui';
import WorkspaceBackup from '@/components/WorkspaceBackup';
import { useLedger } from '@/ledger';
import { useLocalWorkspace } from '@/providers';

export default function SettingsScreen() {
  const router = useRouter();
  const { workspace, selectWorkspace } = useLocalWorkspace();
  const { refresh } = useLedger();
  const [pending, setPending] = useState<'refresh' | 'switch' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const isDemo = workspace === 'demo';
  const location = Platform.OS === 'web' ? 'this browser on this device' : 'this app on this device';

  async function run(action: 'refresh' | 'switch') {
    if (busy.current || backupBusy) return;
    busy.current = true;
    setPending(action);
    setMessage('');
    setError('');
    try {
      if (action === 'refresh') {
        await refresh();
        setMessage('Workspace refreshed.');
      } else {
        await selectWorkspace(isDemo ? 'personal' : 'demo');
        // Discard the previous workspace’s navigation stack, including open record editors.
        if (router.canDismiss()) router.dismissAll();
        router.replace('/');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This action could not be completed. Please try again.');
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  return (
    <Page narrow>
      <Header title="Settings" />
      <Card>
        <View style={styles.spread}>
          <SectionTitle>{isDemo ? 'Sample workspace' : 'Personal workspace'}</SectionTitle>
          <Badge tone={isDemo ? 'neutral' : 'green'}>Saved locally</Badge>
        </View>
        <Body muted>{isDemo
          ? 'Explore the sample properties and rent payments here. Your personal records are kept separately.'
          : 'Manage your properties, tenants, leases and payments here. You can explore sample records in a separate workspace.'}</Body>
        <View style={{ alignSelf: 'flex-start' }}>
          <Action icon="repeat" label={pending === 'switch' ? 'Switching…' : isDemo ? 'Open personal workspace' : 'Explore sample workspace'}
            variant="secondary" disabled={pending !== null || backupBusy} onPress={() => void run('switch')} />
        </View>
      </Card>
      <Card>
        <SectionTitle>Local storage</SectionTitle>
        <Body muted>Records are saved in {location}. Clearing {Platform.OS === 'web' ? 'site' : 'app'} data removes them.</Body>
        <View style={{ alignSelf: 'flex-start' }}>
          <Action icon="refresh-cw" label={pending === 'refresh' ? 'Refreshing…' : 'Refresh workspace'} variant="secondary"
            disabled={pending !== null || backupBusy} onPress={() => void run('refresh')} />
        </View>
      </Card>
      <WorkspaceBackup disabled={pending !== null} onBusyChange={setBackupBusy} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}
    </Page>
  );
}

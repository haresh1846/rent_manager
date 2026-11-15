import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Action, Body, Card, Label, Notice, SectionTitle, palette } from './ui';
import { useLedger, type RestorePreview } from '@/ledger';
import { useLocalWorkspace, type LocalWorkspace } from '@/providers';
import { pickBackupFile, saveBackupFile } from '@/services/backupFile';

type Operation = 'export' | 'choose' | 'restore';

const recordTypes = [
  ['properties', 'Properties'],
  ['tenants', 'Tenants'],
  ['leases', 'Leases'],
  ['payments', 'Payments'],
  ['maintenance', 'Maintenance requests'],
] as const;

function workspaceName(workspace: LocalWorkspace) {
  return workspace === 'demo' ? 'Sample workspace' : 'Personal workspace';
}

function displayDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function WorkspaceBackup({ disabled, onBusyChange }: {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const { workspace } = useLocalWorkspace();
  const { exportBackup, prepareRestore, restoreBackup } = useLedger();
  const [review, setReview] = useState<{ filename: string; preview: RestorePreview } | null>(null);
  const [pending, setPending] = useState<Operation | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const inFlight = useRef(false);

  async function run(action: Operation) {
    if (disabled || inFlight.current || (action === 'restore' && !review)) return;
    inFlight.current = true;
    onBusyChange(true);
    setPending(action);
    setError('');
    setMessage('');
    let reviewing = false;
    try {
      if (action === 'export') {
        const contents = await exportBackup();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        try {
          await saveBackupFile(contents, `rent-manager-${workspace}-${timestamp}.json`);
        } catch (cause) {
          if (cause && typeof cause === 'object' && 'name' in cause && cause.name === 'AbortError') return;
          throw cause;
        }
        setMessage('Backup file prepared for saving.');
      } else if (action === 'choose') {
        const file = await pickBackupFile();
        if (!file) return;
        const preview = await prepareRestore(file.text);
        setReview({ filename: file.name, preview });
        reviewing = true;
      } else if (review) {
        await restoreBackup(review.preview);
        setReview(null);
        setMessage(`${workspaceName(workspace)} restored from the backup.`);
      }
    } catch (cause) {
      if (action === 'restore') setReview(null);
      setError(cause instanceof Error ? cause.message : 'The backup operation could not be completed. Please try again.');
    } finally {
      inFlight.current = false;
      setPending(null);
      onBusyChange(reviewing);
    }
  }

  function cancel() {
    if (inFlight.current) return;
    setReview(null);
    setError('');
    setMessage('');
    onBusyChange(false);
  }

  const blocked = disabled || pending !== null;
  return (
    <Card>
      <SectionTitle>Backup and restore</SectionTitle>
      {review ? (
        <>
          <View style={view.divider} />
          <SectionTitle>Review backup</SectionTitle>
          <View style={view.details}>
            <Label>File</Label><Body>{review.filename}</Body>
            <Label>Created</Label><Body>{displayDate(review.preview.backup.exportedAt)}</Body>
            <Label>Source workspace</Label><Body>{workspaceName(review.preview.backup.workspace)}</Body>
          </View>
          <View style={view.table}>
            <View style={[view.row, view.tableHead]}>
              <Text style={view.name}>Records</Text>
              <Text style={view.count}>Current</Text>
              <Text style={view.count}>Backup</Text>
            </View>
            {recordTypes.map(([key, label]) => (
              <View key={key} style={view.row} accessible accessibilityLabel={
                `${label}, currently ${review.preview.currentCounts[key]}, backup ${review.preview.backup.ledger[key].length}`
              }>
                <Text style={view.name}>{label}</Text>
                <Text style={view.count}>{review.preview.currentCounts[key]}</Text>
                <Text style={view.count}>{review.preview.backup.ledger[key].length}</Text>
              </View>
            ))}
          </View>
          <Notice>Restoring replaces every record in your {workspace === 'demo' ? 'sample' : 'personal'} workspace with the records in this file.</Notice>
          <View style={view.actions}>
            <Action label="Cancel" variant="secondary" disabled={blocked} onPress={cancel} />
            <Action label={pending === 'restore' ? 'Restoring…' : 'Replace workspace records'} disabled={blocked} onPress={() => void run('restore')} />
          </View>
        </>
      ) : (
        <>
          <Body muted>Backups include tenant details and payment history. Save the JSON file in a private folder on your device.</Body>
          <View style={view.actions}>
            <Action icon="download" label={pending === 'export' ? 'Preparing backup…' : 'Export backup'} variant="secondary" disabled={blocked} onPress={() => void run('export')} />
            <Action icon="upload" label={pending === 'choose' ? 'Reading backup…' : 'Restore from file'} variant="secondary" disabled={blocked} onPress={() => void run('choose')} />
          </View>
        </>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}
    </Card>
  );
}

const view = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  divider: { borderTopWidth: 1, borderColor: palette.line },
  details: { gap: 4 },
  table: { borderWidth: 1, borderColor: palette.line, borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tableHead: { backgroundColor: palette.paper },
  name: { flex: 1, fontSize: 14, color: palette.ink },
  count: { minWidth: 55, textAlign: 'right', color: palette.ink, fontSize: 14, fontVariant: ['tabular-nums'] },
});

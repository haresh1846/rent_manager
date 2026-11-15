import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useLedger } from '@/ledger';
import { Action, Card, Choices, Empty, Header, Notice, Page } from '@/components/ui';
import { cap, prettyDate, RecordRow } from '@/components/portfolio';
export default function Maintenance() {
  const { data, setMaintenanceStatus } = useLedger(),
    router = useRouter();
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState('');
  const list = data.maintenance.filter((r) => filter === 'all' || r.status === filter);
  async function change(id: string, status: 'open' | 'resolved') {
    setError('');
    setBusy(id);
    try {
      await setMaintenanceStatus(id, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update request.');
    } finally {
      setBusy('');
    }
  }
  return (
    <Page>
      <Header
        title="Maintenance"
        subtitle="Track property repairs from request to resolution."
        action={
          <Action
            label="New maintenance request"
            icon="plus"
            onPress={() => router.push('/maintenance/add')}
          />
        }
      />
      <Card>
        <Choices
          label="Request status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'all', label: 'All' },
          ]}
        />
        {!!error && <Notice tone="error">{error}</Notice>}
        {list.length ? (
          list.map((r) => (
            <RecordRow
              key={r.id}
              icon="tool"
              title={r.title}
              subtitle={[
                data.properties.find((p) => p.id === r.property_id)?.name,
                r.description,
                prettyDate(r.created_at),
              ]
                .filter(Boolean)
                .join(' · ')}
              tag={cap(r.status)}
              tone={r.status === 'open' ? 'amber' : 'green'}
              action={
                <Action
                  label={r.status === 'open' ? 'Mark resolved' : 'Reopen request'}
                  variant="secondary"
                  disabled={!!busy}
                  onPress={() => void change(r.id, r.status === 'open' ? 'resolved' : 'open')}
                />
              }
            />
          ))
        ) : (
          <Empty
            icon="tool"
            title={filter === 'all' ? 'No maintenance requests' : 'No ' + filter + ' requests'}
            detail={
              filter === 'resolved'
                ? 'Completed requests will appear here.'
                : 'New repair requests can be logged against any property.'
            }
          />
        )}
      </Card>
    </Page>
  );
}

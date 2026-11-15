import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLedger } from '@/ledger';
import type { Lease } from '@/types';
import { Action, Body, Card, Empty, Field, Header, Notice, Page, styles } from '@/components/ui';
import { cap, localDate, money, prettyDate, RecordRow } from '@/components/portfolio';
function LeaseActions({ lease }: { lease: Lease }) {
  const router = useRouter();
  const { endLease } = useLedger();
  const [editing, setEditing] = useState(false),
    [date, setDate] = useState(localDate()),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await endLease(lease.id, date);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not end this lease.');
    } finally {
      setBusy(false);
    }
  }
  if (editing)
    return (
      <View style={{ gap: 10 }}>
        <Field label="Move-out date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Body muted>
          Ending the lease releases the property. Rent remains payable for the final billing month.
        </Body>
        {!!error && <Notice tone="error">{error}</Notice>}
        <View style={styles.wrap}>
          <Action
            label={busy ? 'Saving…' : 'Confirm move-out'}
            disabled={busy}
            onPress={() => void confirm()}
          />
          <Action
            label="Cancel"
            variant="quiet"
            disabled={busy}
            onPress={() => setEditing(false)}
          />
        </View>
      </View>
    );
  return (
    <View style={styles.wrap}>
      <Action
        label="Record payment"
        variant="secondary"
        onPress={() => router.push({ pathname: '/payments/add', params: { lease: lease.id } })}
      />
      {lease.status === 'active' && lease.start_date <= localDate() && (
        <Action label="End lease" onPress={() => setEditing(true)} variant="quiet" />
      )}
    </View>
  );
}
export default function Leases() {
  const { data } = useLedger(),
    router = useRouter();
  return (
    <Page>
      <Header
        title="Leases"
        subtitle="Rental agreements, monthly terms and advance balances."
        action={
          <Action label="Create lease" icon="plus" onPress={() => router.push('/leases/add')} />
        }
      />
      <Card>
        {data.leases.length ? (
          data.leases.map((l) => {
            const tenant = data.tenants.find((t) => t.id === l.tenant_id),
              property = data.properties.find((p) => p.id === l.property_id);
            const status =
              l.start_date > localDate() && l.status === 'active' ? 'Scheduled' : cap(l.status);
            return (
              <RecordRow
                key={l.id}
                title={property?.name || 'Property'}
                subtitle={[
                  tenant?.name,
                  prettyDate(l.start_date) +
                    ' – ' +
                    (l.end_date ? prettyDate(l.end_date) : 'Open-ended'),
                  'Advance ' + money(l.advance_balance),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                icon="file-text"
                amount={money(l.monthly_rent) + ' / mo'}
                tag={status}
                tone={status === 'Active' ? 'green' : 'neutral'}
                action={<LeaseActions lease={l} />}
              />
            );
          })
        ) : (
          <Empty
            icon="file-text"
            title="No leases yet"
            detail="Create a lease to link a property and tenant and begin tracking rent."
          />
        )}
      </Card>
    </Page>
  );
}

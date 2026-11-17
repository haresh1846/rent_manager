import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { fundBalances, useLedger } from '@/ledger';
import { isPostedPayment } from '@/ledger/model';
import { getTenantStatement } from '@/ledger/statements';
import type { Lease } from '@/types';
import { Action, Body, Card, Empty, Field, Header, Notice, Page, SectionTitle, styles } from '@/components/ui';
import { cap, localDate, money, prettyDate, RecordRow } from '@/components/portfolio';
function LeaseActions({ lease }: { lease: Lease }) {
  const router = useRouter();
  const { endLease, data } = useLedger();
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
  const closed = lease.status === 'terminated' || lease.status === 'expired';
  function closingSummary() {
    const today = localDate();
    const cutoff = (editing ? date : lease.end_date || today).slice(0, 7);
    const months = (getTenantStatement(data, lease.tenant_id)?.months ?? [])
      .filter(m => m.leaseId === lease.id && m.period <= cutoff && m.outstanding > 0)
      .sort((a, b) => a.period.localeCompare(b.period));
    const unpaid = months.reduce((sum, m) => sum + Math.round(m.outstanding * 100), 0) / 100;
    const funds = fundBalances(data, lease, today);
    const payments = data.payments.filter(p => p.lease_id === lease.id && isPostedPayment(p) && p.payment_date <= today);
    const deductions = payments.filter(p => p.payment_type === 'deposit_deduction');
    const refunded = payments.reduce((sum, p) => sum + (p.payment_type === 'advance_refund' || p.payment_type === 'deposit_refund'
      ? Math.round(p.amount * 100) : 0), 0) / 100;
    function settle(type: 'advance_refund' | 'deposit_refund' | 'deposit_deduction', amount?: number) {
      router.push({ pathname: '/payments/add', params: { lease: lease.id, type, from: 'leases', ...(amount && { amount: String(amount) }) } });
    }
    return (
      <Card style={{ gap: 8 }}>
        <SectionTitle>Move-out statement</SectionTitle>
        <Body>Unpaid rent {money(unpaid)}</Body>
        {closed && months.length > 0 && (
          <View style={styles.wrap}>
            <Action label="Collect outstanding rent" variant="secondary"
              onPress={() => router.push({ pathname: '/payments/add', params: {
                lease: lease.id, month: months[0].period, amount: String(months[0].outstanding), from: 'leases',
              } })} />
          </View>
        )}
        <Body>Advance held {money(funds.advance)} · Deposit held {money(funds.deposit)}</Body>
        <Body muted>Refunds recorded {money(refunded)}</Body>
        {deductions.map(p => <Body key={p.id} muted>Deposit deduction {money(p.amount)} · {p.notes} · {prettyDate(p.payment_date)}</Body>)}
        {closed && (funds.advance > 0 || funds.deposit > 0) && (
          <View style={styles.wrap}>
            {funds.advance > 0 && <Action label="Refund advance" variant="secondary" onPress={() => settle('advance_refund', funds.advance)} />}
            {funds.deposit > 0 && <>
              <Action label="Refund deposit" variant="secondary" onPress={() => settle('deposit_refund', funds.deposit)} />
              <Action label="Deduct from deposit" variant="quiet" onPress={() => settle('deposit_deduction')} />
            </>}
          </View>
        )}
      </Card>
    );
  }
  if (editing)
    return (
      <View style={{ gap: 10 }}>
        <Field label="Move-out date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Body muted>
          Ending the lease releases the property. Rent remains payable for the final billing month.
        </Body>
        {closingSummary()}
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
    <View style={{ gap: 10 }}>
      {closed && closingSummary()}
      <View style={styles.wrap}>
        <Action
          label="Record payment"
          variant="secondary"
          onPress={() => router.push({ pathname: '/payments/add', params: { lease: lease.id, from: 'leases' } })}
        />
        {lease.status === 'active' && lease.start_date <= localDate() && (
          <Action label="End lease" onPress={() => setEditing(true)} variant="quiet" />
        )}
      </View>
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
                  'Advance ' + money(fundBalances(data, l).advance),
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

import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { localDate, useLedger } from '@/ledger';
import { billingMonthParam } from '@/ledger/model';
import { Action, Body, Card, Empty, Field, Header, Notice, Page, styles } from '@/components/ui';
import { money, MonthPicker, PanelHead, PaymentRow, prettyDate } from '@/components/portfolio';
import type { Payment } from '@/types';

function PaymentHistory({ payment, original, replacement }: { payment: Payment; original?: Payment; replacement?: Payment }) {
  const { reversePayment } = useLedger();
  const router = useRouter();
  const [editing, setEditing] = useState(false), [reason, setReason] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await reversePayment(payment.id, reason);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This payment could not be reversed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      {payment.notes ? <Body muted>{payment.notes}</Body> : null}
      {original && <Body muted>Replacement for {money(original.amount)} dated {prettyDate(original.payment_date)}.</Body>}
      {payment.reversal ? (
        <>
          <Body muted>Reversed {prettyDate(payment.reversal.reversed_at)} · {payment.reversal.reason}</Body>
          {replacement ? <Body muted>Replaced with {money(replacement.amount)} dated {prettyDate(replacement.payment_date)}.</Body>
            : <View style={styles.wrap}><Action variant="secondary" label="Record replacement"
                onPress={() => router.push({ pathname: '/payments/add', params: { replaces: payment.id } })} /></View>}
        </>
      ) : editing ? (
        <>
          <Body>Reversing this entry updates balances and keeps its history.</Body>
          <Field label="Reason for reversal" value={reason} onChangeText={setReason} maxLength={500} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <View style={styles.wrap}>
            <Action label={busy ? 'Reversing…' : 'Confirm reversal'} disabled={busy} onPress={() => void confirm()} />
            <Action label="Cancel" variant="quiet" disabled={busy} onPress={() => { setEditing(false); setError(''); }} />
          </View>
        </>
      ) : <View style={styles.wrap}>
        <Action label="Reverse payment" variant="quiet" onPress={() => setEditing(true)} />
      </View>}
    </View>
  );
}

export default function Payments() {
  const { data } = useLedger(),
    router = useRouter();
  const { month } = useLocalSearchParams<{ month?: string }>();
  const billingMonth = billingMonthParam(month) ?? localDate().slice(0, 7);
  const period = new Date(billingMonth + '-15T12:00:00');
  const byId = new Map(data.payments.map(p => [p.id, p]));
  const replacements = new Map(data.payments.filter(p => p.replaces_payment_id).map(p => [p.replaces_payment_id, p]));
  const list = data.payments
    .filter((p) => p.year === period.getFullYear() && p.month === period.getMonth() + 1)
    .sort(
      (a, b) =>
        b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at)
    );
  return (
    <Page>
      <Header
        title="Payments"
        subtitle="Rent, deposits and advance transactions."
        action={
          <Action label="Record payment" icon="plus"
            onPress={() => router.push({ pathname: '/payments/add', params: { month: billingMonth } })} />
        }
      />
      <Card>
        <PanelHead title="Billing month" action={
          <MonthPicker value={period} onChange={date => router.setParams({ month: localDate(date).slice(0, 7) })} />
        } />
        {list.length ? (
          list.map((p) => (
            <View key={p.id} style={{ gap: 4 }}>
              <PaymentRow payment={p} property={data.properties.find((x) => x.id === p.property_id)?.name}
                tenant={data.tenants.find((x) => x.id === p.tenant_id)?.name} />
              <PaymentHistory payment={p} original={p.replaces_payment_id ? byId.get(p.replaces_payment_id) : undefined}
                replacement={replacements.get(p.id)} />
            </View>
          ))
        ) : (
          <Empty
            icon="credit-card"
            title="No payments for this month"
            detail="Record a payment or select another billing month."
          />
        )}
      </Card>
    </Page>
  );
}

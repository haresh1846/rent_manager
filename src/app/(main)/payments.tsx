import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useLedger } from '@/ledger';
import { Action, Body, Card, Empty, Header, Page } from '@/components/ui';
import { MonthPicker, PaymentRow } from '@/components/portfolio';
export default function Payments() {
  const { data } = useLedger(),
    router = useRouter();
  const [period, setPeriod] = useState(() => new Date());
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
          <Action label="Record payment" icon="plus" onPress={() => router.push('/payments/add')} />
        }
      />
      <Card>
        <Body muted>Billing month</Body>
        <MonthPicker value={period} onChange={setPeriod} />
        {list.length ? (
          list.map((p) => (
            <PaymentRow
              payment={p}
              key={p.id}
              property={data.properties.find((x) => x.id === p.property_id)?.name}
              tenant={data.tenants.find((x) => x.id === p.tenant_id)?.name}
            />
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

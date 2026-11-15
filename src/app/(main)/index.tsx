import { useRouter } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { calculateMonth, useLedger } from '@/ledger';
import { Action, Card, Empty, Header, Page, SectionTitle, styles } from '@/components/ui';
import {
  CollectionSummary,
  Metric,
  money,
  PanelHead,
  PaymentRow,
  periodName,
  RecordRow,
} from '@/components/portfolio';

export default function Dashboard() {
  const { data } = useLedger();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const now = new Date();
  const month = calculateMonth(data, now.getFullYear(), now.getMonth() + 1);
  const outstanding = month.rows
    .filter((row) => row.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
  const occupied = data.properties.filter((p) => p.status === 'occupied').length;
  const open = data.maintenance.filter((r) => r.status === 'open').length;
  const recent = [...data.payments]
    .sort(
      (a, b) =>
        b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at)
    )
    .slice(0, 4);
  return (
    <Page>
      <Header
        title="Portfolio overview"
        subtitle={now.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        action={
          data.properties.length ? (
            <Action label="Record payment" icon="plus" onPress={() => router.push('/payments/add')} />
          ) : (
            <Action
              label="Add your first property"
              icon="plus"
              onPress={() => router.push('/properties/add')}
            />
          )
        }
      />
      <CollectionSummary {...month} period={periodName(now.getFullYear(), now.getMonth() + 1)} />
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Metric
          label="Properties"
          icon="home"
          value={String(data.properties.length)}
          detail={occupied + ' occupied'}
        />
        <Metric
          label="Tenants"
          icon="users"
          value={String(data.tenants.length)}
          detail={data.tenants.filter((t) => t.property_id).length + ' currently leasing'}
        />
        <Metric label="Maintenance" icon="tool" value={String(open)} detail="Open requests" />
      </View>
      <View style={{ flexDirection: width >= 1120 ? 'row' : 'column', gap: 16 }}>
        <Card style={{ flex: 1 }}>
          <PanelHead
            title="Outstanding rent"
            action={
              <Action
                variant="quiet"
                label="View reports"
                icon="arrow-up-right"
                onPress={() => router.push('/reports')}
              />
            }
          />
          {outstanding.length ? (
            outstanding
              .slice(0, 4)
              .map((r) => (
                <RecordRow
                  key={r.lease.id}
                  title={r.tenant.name}
                  subtitle={r.property.name}
                  icon="clock"
                  amount={money(r.outstanding)}
                  tag={r.collected ? 'Part paid' : 'Unpaid'}
                  tone="amber"
                />
              ))
          ) : (
            <Empty
              icon="check-circle"
              title={month.rows.length ? 'Rent is up to date' : 'No rent due this month'}
              detail={
                month.rows.length
                  ? 'Every lease is settled for this month.'
                  : 'Create a lease to see scheduled rent here.'
              }
            />
          )}
        </Card>
        <Card style={{ flex: 1 }}>
          <PanelHead
            title="Recent payments"
            action={
              <Action
                variant="quiet"
                label="View payments"
                icon="arrow-up-right"
                onPress={() => router.push('/payments')}
              />
            }
          />
          {recent.length ? (
            recent.map((p) => (
              <PaymentRow
                key={p.id}
                payment={p}
                property={data.properties.find((x) => x.id === p.property_id)?.name}
                tenant={data.tenants.find((x) => x.id === p.tenant_id)?.name}
              />
            ))
          ) : (
            <Empty
              icon="credit-card"
              title="No payments yet"
              detail="Recorded rent and advance payments will appear here."
            />
          )}
        </Card>
      </View>
      <View style={{ gap: 12 }}>
        <SectionTitle>Quick actions</SectionTitle>
        <View style={styles.wrap}>
          <Action
            label="Add property"
            icon="home"
            variant="secondary"
            onPress={() => router.push('/properties/add')}
          />
          <Action
            label="Add tenant"
            icon="user-plus"
            variant="secondary"
            onPress={() => router.push('/tenants/add')}
          />
          <Action
            label="Create lease"
            icon="file-text"
            variant="secondary"
            onPress={() => router.push('/leases/add')}
          />
          <Action
            label="New maintenance request"
            icon="tool"
            variant="secondary"
            onPress={() => router.push('/maintenance/add')}
          />
        </View>
      </View>
    </Page>
  );
}

import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { calculateMonth, useLedger } from '@/ledger';
import { getArrears } from '@/ledger/statements';
import { CollectRentButton, monthLabel, TenantStatementButton } from '@/components/RentActions';
import { Action, Card, Empty, Header, Page, styles } from '@/components/ui';
import { OverviewSummary, PortfolioTiles } from '@/components/OverviewSummary';
import { RentBreakdown, SetupPanel, Shortcut } from '@/components/PortfolioOverviewPanels';
import { localDate, money, PanelHead, PaymentRow, periodName, RecordRow } from '@/components/portfolio';

export default function Dashboard() {
  const { data } = useLedger();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const now = new Date();
  const month = calculateMonth(data, now.getFullYear(), now.getMonth() + 1);
  const today = localDate();
  const outstanding = useMemo(() => getArrears(data, today), [data, today]);
  const occupied = data.properties.filter((p) => p.status === 'occupied').length;
  const open = data.maintenance.filter((r) => r.status === 'open').length;
  const recent = [...data.payments]
    .sort(
      (a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at)
    )
    .slice(0, 4);
  const hasLeases = data.leases.length > 0;
  const monthName = periodName(now.getFullYear(), now.getMonth() + 1);
  const totalOutstanding =
    outstanding.reduce((sum, account) => sum + Math.round(account.outstanding * 100), 0) / 100;
  const nextAction = !data.properties.length
    ? { label: 'Add your first property', route: '/properties/add' as const }
    : !data.tenants.length
      ? { label: 'Add tenant', route: '/tenants/add' as const }
      : !hasLeases
        ? { label: 'Create lease', route: '/leases/add' as const }
        : { label: 'Record payment', route: '/payments/add' as const };
  const sideBySide = width >= 1080 || (width >= 740 && width < 900);
  const panelDirection = sideBySide ? 'row' : 'column';
  const primaryPanelStyle = { minWidth: 0, flex: sideBySide ? 1.18 : undefined };
  const secondaryPanelStyle = { minWidth: 0, flex: sideBySide ? 1 : undefined };
  const payments = (
    <Card style={primaryPanelStyle}>
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
          detail="Your latest receipts will appear here after you record a payment."
        />
      )}
    </Card>
  );
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
          <Action label={nextAction.label} icon="plus" onPress={() => router.push(nextAction.route)} />
        }
      />
      <OverviewSummary collected={month.collected} due={month.due} period={monthName} />
      <PortfolioTiles
        tiles={[
          {
            label: 'Outstanding rent',
            value: money(totalOutstanding),
            detail: 'Across all months',
            icon: 'clock',
            color: '#915939',
            tint: '#F5EAE0',
            onPress: () => router.push('/arrears'),
          },
          {
            label: 'Properties',
            value: String(data.properties.length),
            detail: occupied + ' occupied',
            icon: 'home',
            color: '#386047',
            tint: '#E5EEDF',
            onPress: () => router.push('/properties'),
          },
          {
            label: 'Tenants',
            value: String(data.tenants.length),
            detail: data.tenants.filter((t) => t.property_id).length + ' currently leasing',
            icon: 'users',
            color: '#5C6471',
            tint: '#EBEDF1',
            onPress: () => router.push('/tenants'),
          },
          {
            label: 'Maintenance',
            value: String(open),
            detail: 'Open requests',
            icon: 'tool',
            color: '#716340',
            tint: '#F1EDDE',
            onPress: () => router.push('/maintenance'),
          },
        ]}
      />
      <View style={{ flexDirection: panelDirection, gap: 16 }}>
        {hasLeases ? (
          <RentBreakdown style={primaryPanelStyle} rows={month.rows} onReport={() => router.push('/reports')} />
        ) : (
          <SetupPanel style={primaryPanelStyle} hasProperty={!!data.properties.length} hasTenant={!!data.tenants.length} />
        )}
        {hasLeases ? (
          <Card style={secondaryPanelStyle}>
            <PanelHead
              title="Outstanding accounts"
              action={
                <Action
                  variant="quiet"
                  label="View arrears"
                  icon="arrow-up-right"
                  onPress={() => router.push('/arrears')}
                />
              }
            />
            {outstanding.length ? (
              outstanding.slice(0, 4).map((r) => (
                <RecordRow
                  key={r.tenant.id}
                  title={r.tenant.name}
                  subtitle={r.oldest.propertyName + ' · ' + monthLabel(r.oldest.period)}
                  icon="user"
                  amount={money(r.outstanding)}
                  tag={r.pastDue > 0 ? 'Prior rent due' : 'This month'}
                  tone="amber"
                  action={
                    <View style={styles.wrap}>
                      <CollectRentButton
                        from="overview"
                        label={r.months.length > 1 ? 'Collect oldest payment' : 'Record payment'}
                        leaseId={r.oldest.leaseId}
                        period={r.oldest.period}
                        amount={r.oldest.outstanding}
                      />
                      <TenantStatementButton tenantId={r.tenant.id} />
                    </View>
                  }
                />
              ))
            ) : (
              <Empty
                icon="check-circle"
                title="No outstanding rent"
                detail="All billed installments are settled."
              />
            )}
          </Card>
        ) : (
          payments
        )}
      </View>
      {hasLeases && <View style={{ flexDirection: panelDirection, gap: 16 }}>
        {payments}
        <Card style={[secondaryPanelStyle, { gap: 4 }]}>
          <PanelHead title="Quick actions" />
          <Shortcut label="Add property" icon="home" onPress={() => router.push('/properties/add')} />
          <Shortcut label="Add tenant" icon="user-plus" onPress={() => router.push('/tenants/add')} />
          <Shortcut label="Create lease" icon="file-text" onPress={() => router.push('/leases/add')} />
          <Shortcut
            label="New maintenance request"
            icon="tool"
            onPress={() => router.push('/maintenance/add')}
          />
        </Card>
      </View>}
    </Page>
  );
}

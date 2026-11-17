import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { calculateMonth, useLedger } from '@/ledger';
import { billingMonthParam, calculateCashMonth, isCashRefund, localDate, type Ledger } from '@/ledger/model';
import { Action, Badge, Card, Choices, Empty, Header, Page } from '@/components/ui';
import { BalanceLine, CellText, CellTitle, LedgerTable } from '@/components/LedgerTable';
import { CollectRentButton, TenantStatementButton } from '@/components/RentActions';
import {
  CollectionSummary,
  cap,
  Metric,
  money,
  MonthPicker,
  PanelHead,
  periodName,
  prettyDate,
} from '@/components/portfolio';
function CashReport({ data, period }: { data: Ledger; period: string }) {
  const cash = calculateCashMonth(data, period);
  const properties = new Map(data.properties.map(p => [p.id, p.name]));
  const tenants = new Map(data.tenants.map(t => [t.id, t.name]));
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Metric label="Cash received" value={money(cash.received)} icon="arrow-down-left" />
        <Metric label="Cash refunded" value={money(cash.refunded)} icon="arrow-up-right" />
        <Metric label="Net cash flow" value={(cash.net < 0 ? '−' : '') + money(Math.abs(cash.net))} icon="credit-card" />
      </View>
      <Card>
        <PanelHead title="Cash transactions" />
        {cash.receipts.length ? (
          <LedgerTable name="Cash transactions" records={cash.receipts} rowKey={p => p.id} columns={[
            {label: 'Tenant / Property', share: 2, render: p => <CellTitle title={tenants.get(p.tenant_id) ?? 'Tenant'} detail={properties.get(p.property_id)} icon={isCashRefund(p) ? 'arrow-up-right' : 'arrow-down-left'} />},
            {label: 'Receipt date', render: p => <CellText>{prettyDate(p.payment_date)}</CellText>},
            {label: 'Transaction', share: 1.25, render: p => <CellTitle title={cap(p.payment_type)} detail={p.payment_type === 'rent' ? 'For ' + periodName(p.year, p.month) : undefined} />},
            {label: 'Amount', numeric: true, render: p => <CellText amount>{(isCashRefund(p) ? '−' : '') + money(p.amount)}</CellText>},
          ]} />
        ) : <Empty icon="credit-card" title="No cash transactions this month" detail="Receipts and refunds appear here by their payment date." />}
      </Card>
    </>
  );
}
export default function Reports() {
  const { data } = useLedger();
  const router = useRouter();
  const params = useLocalSearchParams<{ month?: string; view?: string }>();
  const billingMonth = billingMonthParam(params.month) ?? localDate().slice(0, 7);
  const period = new Date(billingMonth + '-15T12:00:00');
  const view = params.view === 'cash' ? 'cash' : 'billing';
  return (
    <Page>
      <Header
        title="Collection report"
        subtitle="Monthly rent collection and cash movements."
        action={<MonthPicker value={period} onChange={(date) => router.setParams({ month: localDate(date).slice(0, 7) })} />}
      />
      <Choices label="Report by" value={view} onChange={value => router.setParams({ view: value })}
        options={[{ value: 'billing', label: 'Billing month' }, { value: 'cash', label: 'Receipt date' }]} />
      {view === 'cash' ? <CashReport data={data} period={billingMonth} />
        : <BillingReport data={data} billingMonth={billingMonth} />}
    </Page>
  );
}

function BillingReport({ data, billingMonth }: { data: Ledger; billingMonth: string }) {
  const router = useRouter();
  const [year, month] = billingMonth.split('-').map(Number);
  const stats = calculateMonth(data, year, month);
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <View style={{flexGrow: 1.6, flexShrink: 1, flexBasis: 400, minWidth: 0}}>
          <CollectionSummary {...stats} period={periodName(year, month)} />
        </View>
        <Card style={{flexGrow: 1, flexShrink: 1, flexBasis: 255, minWidth: 0, justifyContent: 'center', gap: 16}}>
          <PanelHead title="Collection breakdown" />
          <BalanceLine label="Cash toward billed rent" value={money(stats.cashCollected)} icon="credit-card" />
          <BalanceLine label="Advance applied" value={money(stats.advanceApplied)} icon="repeat" />
          <BalanceLine label="Current advance balance" value={money(stats.advanceBalance)} icon="briefcase" />
        </Card>
      </View>
      <Card>
        <PanelHead title="Rent by lease" action={
          <Action label="All-month arrears" variant="quiet" icon="arrow-up-right" onPress={() => router.push('/arrears')} />
        } />
        {stats.rows.length ? (
          <LedgerTable name="Rent by lease" records={stats.rows} rowKey={r => r.lease.id} columns={[
            {label: 'Property / Tenant', share: 2.3, render: r => <CellTitle title={r.property.name} detail={r.tenant.name} icon="home" />},
            {label: 'Billed', numeric: true, render: r => <CellText>{money(r.due)}</CellText>},
            {label: 'Settled', numeric: true, render: r => <CellText>{money(r.collected)}</CellText>},
            {label: 'Balance due', share: 1.1, numeric: true, render: r => <CellText amount due={r.outstanding > 0}>{money(r.outstanding)}</CellText>},
            {label: 'Status', render: r => <Badge tone={r.outstanding ? 'amber' : 'green'}>{r.outstanding === 0 ? 'Settled' : r.collected > 0 ? 'Part paid' : 'Unpaid'}</Badge>},
          ]} actions={r => <>
            {r.outstanding > 0 && <CollectRentButton from="reports" leaseId={r.lease.id} period={billingMonth} amount={r.outstanding} />}
            <TenantStatementButton tenantId={r.tenant.id} />
          </>} />
        ) : (
          <Empty
            title="No leases for this month"
            detail="Choose another month or create a lease."
            action={
              <Action
                label="View leases"
                onPress={() => router.push('/leases')}
                variant="secondary"
              />
            }
          />
        )}
      </Card>
    </>
  );
}

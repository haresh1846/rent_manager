import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLedger } from '@/ledger';
import { getTenantStatement } from '@/ledger/statements';
import { Action, Badge, Card, Empty, Header, Page } from '@/components/ui';
import { BalanceLine, CellText, CellTitle, LedgerTable } from '@/components/LedgerTable';
import { BackAction, localDate, Metric, money, PanelHead, prettyDate } from '@/components/portfolio';
import { CollectRentButton, monthLabel } from '@/components/RentActions';
import { StatementExports } from '@/components/StatementExports';

const pageSize = 12;

export default function TenantStatementScreen() {
  const { data } = useLedger();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const today = localDate();
  const statement = useMemo(() => getTenantStatement(data, id, today), [data, id, today]);
  const [monthLimit, setMonthLimit] = useState(pageSize);
  const [receiptLimit, setReceiptLimit] = useState(pageSize);
  const back = <BackAction label="Tenant directory" onPress={() => router.navigate('/tenants')} />;
  if (!statement) return (
    <Page>
      {back}
      <Card><Empty title="Tenant unavailable" detail="Choose a tenant from this workspace's directory." /></Card>
    </Page>
  );

  return (
    <Page>
      {back}
      <Header title={statement.tenant.name} subtitle={'Tenant statement · As of ' + prettyDate(today)}
        action={<StatementExports statement={statement} />} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Metric label="Rent outstanding" value={money(statement.outstanding)} icon="clock" />
        <Metric label="Rent billed" value={money(statement.billed)} icon="calendar" />
        <Metric label="Rent settled" value={money(statement.settled)} icon="check-circle" />
      </View>
      <Card>
        <PanelHead title="Tenant funds" />
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 20}}>
          <View style={{flexGrow: 1, flexShrink: 1, flexBasis: 270}}>
            <BalanceLine icon="repeat" label="Available advance" value={money(statement.advanceBalance)} />
          </View>
          <View style={{flexGrow: 1, flexShrink: 1, flexBasis: 270}}>
            <BalanceLine icon="lock" label="Security deposit held" value={money(statement.depositBalance)} />
          </View>
        </View>
      </Card>
      <Card>
        <PanelHead title="Rent by month" />
        {statement.months.length ? (
          <LedgerTable name="Rent by month" records={statement.months.slice(0, monthLimit)} rowKey={r => r.leaseId + r.period} columns={[
            {label: 'Billing month', share: 1.9, render: r => <CellTitle title={monthLabel(r.period)} detail={r.propertyName} />},
            {label: 'Billed', numeric: true, render: r => <CellText>{money(r.rent)}</CellText>},
            {label: 'Cash', numeric: true, render: r => <CellText>{money(r.cash)}</CellText>},
            {label: 'Advance used', numeric: true, render: r => <CellText>{money(r.advanceApplied)}</CellText>},
            {label: 'Outstanding', numeric: true, render: r => <CellText amount due={r.outstanding > 0}>{money(r.outstanding)}</CellText>},
            {label: 'Status', render: r => <Badge tone={r.outstanding ? 'amber' : 'green'}>{r.outstanding === 0 ? 'Settled' : r.cash || r.advanceApplied ? 'Part paid' : 'Unpaid'}</Badge>},
          ]} actions={r => r.outstanding > 0 && <CollectRentButton from="statement" tenantId={statement.tenant.id}
            leaseId={r.leaseId} period={r.period} amount={r.outstanding} />} />
        ) : <Empty title="No billed rent yet" detail="Rent appears here when a lease starts." />}
        {monthLimit < statement.months.length && (
          <Action label="Show earlier months" variant="quiet" onPress={() => setMonthLimit((n) => n + pageSize)} />
        )}
      </Card>
      <Card>
        <PanelHead title="Payment history" />
        {statement.receipts.length ? (
          <LedgerTable name="Payment history" records={statement.receipts.slice(0, receiptLimit)} rowKey={r => r.id} columns={[
            {label: 'Transaction', share: 2.7, render: r => <CellTitle title={r.description} detail={[r.propertyName, r.note].filter(Boolean).join(' · ')} />},
            {label: 'Date', render: r => <CellText>{prettyDate(r.date)}</CellText>},
            {label: 'Billing month', render: r => <CellText>{r.period ? monthLabel(r.period) : '—'}</CellText>},
            {label: 'Amount', numeric: true, render: r => <CellText amount>{money(r.amount)}</CellText>},
            {label: 'Status', render: r => <Badge tone={r.status === 'Reversed' || r.status === 'Pending' ? 'neutral' : 'green'}>{r.status}</Badge>},
          ]} />
        ) : <Empty title="No payments yet" detail="Recorded payments, advances and deposit activity will appear here." />}
        {receiptLimit < statement.receipts.length && (
          <Action label="Show earlier payments" variant="quiet" onPress={() => setReceiptLimit((n) => n + pageSize)} />
        )}
      </Card>
    </Page>
  );
}

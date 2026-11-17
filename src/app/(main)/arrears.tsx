import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLedger } from '@/ledger';
import { getArrears, type ArrearsRow } from '@/ledger/statements';
import { Card, Empty, Field, Header, Label, Page } from '@/components/ui';
import { CellText, CellTitle, LedgerTable } from '@/components/LedgerTable';
import { localDate, Metric, money, PanelHead, prettyDate } from '@/components/portfolio';
import { CollectRentButton, monthLabel, TenantStatementButton } from '@/components/RentActions';
import { ArrearsExports } from '@/components/StatementExports';

export default function Arrears() {
  const { data } = useLedger();
  const today = localDate();
  const accounts = useMemo(() => getArrears(data, today), [data, today]);
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const visible = accounts.filter(({ tenant, months }) =>
    tenant.name.toLowerCase().includes(term) || months.some((m) => m.propertyName.toLowerCase().includes(term))
  );
  const past = accounts.reduce((sum, a) => sum + Math.round(a.pastDue * 100), 0) / 100;
  const current = accounts.reduce((sum, a) => sum + Math.round(a.currentDue * 100), 0) / 100;
  const exportRows = useMemo<ArrearsRow[]>(() => accounts.flatMap(({ tenant, months }) =>
    months.map(line => ({ ...line, tenantId: tenant.id, tenantName: tenant.name }))
  ).sort((a, b) => a.period.localeCompare(b.period) || a.tenantName.localeCompare(b.tenantName)), [accounts]);

  return (
    <Page>
      <Header title="Arrears" subtitle={'Outstanding rent across all leases through ' + prettyDate(today)} action={
        <View style={{gap: 6, flexShrink: 1}}>
          <Label>Export all arrears</Label>
          <ArrearsExports rows={exportRows} asOf={today} />
        </View>
      } />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Metric label="Prior months unpaid" value={money(past)} icon="clock" />
        <Metric label="This month unpaid" value={money(current)} icon="calendar" />
        <Metric label="Tenants with a balance" value={String(accounts.length)} icon="users" />
      </View>
      <Card>
        <PanelHead title="Unpaid accounts" />
        {accounts.length > 0 && <View style={{maxWidth: 420, width: '100%'}}>
          <Field label="Find an account" placeholder="Tenant or property name" value={search} onChangeText={setSearch} />
        </View>}
        {visible.length ? (
          <LedgerTable name="Unpaid accounts" records={visible} rowKey={a => a.tenant.id} columns={[
            {label: 'Tenant / Property', share: 1.7, render: a => <CellTitle title={a.tenant.name} detail={a.oldest.propertyName} icon="user" />},
            {label: 'Oldest unpaid', share: 1.3, render: a => <CellTitle title={monthLabel(a.oldest.period)}
              detail={a.months.length + (a.months.length === 1 ? ' open installment' : ' open installments')} />},
            {label: 'Prior months', numeric: true, render: a => <CellText>{money(a.pastDue)}</CellText>},
            {label: 'This month', numeric: true, render: a => <CellText>{money(a.currentDue)}</CellText>},
            {label: 'Total due', numeric: true, render: a => <CellText amount due>{money(a.outstanding)}</CellText>},
          ]} actions={a => <>
            <CollectRentButton from="arrears" label="Collect oldest payment" leaseId={a.oldest.leaseId} period={a.oldest.period} amount={a.oldest.outstanding} />
            <TenantStatementButton tenantId={a.tenant.id} />
          </>} />
        ) : <Empty icon={term ? 'search' : 'check-circle'} title={term ? 'No matching accounts' : 'No outstanding rent'}
          detail={term ? 'Try a different name or property.' : 'There are no unpaid installments on leases that have started.'} />}
      </Card>
    </Page>
  );
}

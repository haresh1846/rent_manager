import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { calculateMonth, useLedger } from '@/ledger';
import { Action, Body, Card, Empty, Header, Page } from '@/components/ui';
import {
  CollectionSummary,
  Metric,
  money,
  MonthPicker,
  PanelHead,
  periodName,
  RecordRow,
} from '@/components/portfolio';
export default function Reports() {
  const { data } = useLedger();
  const router = useRouter();
  const [period, setPeriod] = useState(() => new Date());
  const year = period.getFullYear(),
    month = period.getMonth() + 1;
  const stats = calculateMonth(data, year, month);
  return (
    <Page>
      <Header
        title="Collection report"
        action={<MonthPicker value={period} onChange={setPeriod} />}
      />
      <CollectionSummary {...stats} period={periodName(year, month)} />
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Metric label="Cash rent received" value={money(stats.cashCollected)} icon="credit-card" />
        <Metric label="Advance applied" value={money(stats.advanceApplied)} icon="repeat" />
        <Metric
          label="Current advance balance"
          value={money(stats.advanceBalance)}
          icon="briefcase"
        />
      </View>
      <Card>
        <PanelHead title="Rent by lease" />
        <Body muted>Amounts are assigned to the billing month selected above.</Body>
        {stats.rows.length ? (
          stats.rows.map((r) => (
            <RecordRow
              key={r.lease.id}
              icon="file-text"
              title={r.property.name}
              subtitle={
                r.tenant.name + ' · ' + money(r.collected) + ' of ' + money(r.due) + ' settled'
              }
              amount={money(r.outstanding) + ' due'}
              tag={r.outstanding === 0 ? 'Settled' : r.collected > 0 ? 'Part paid' : 'Unpaid'}
              tone={r.outstanding === 0 ? 'green' : 'amber'}
            />
          ))
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
    </Page>
  );
}

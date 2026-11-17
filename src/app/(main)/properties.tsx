import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLedger } from '@/ledger';
import { Action, Badge, Card, Empty, Field, Header, Page } from '@/components/ui';
import { cap, money } from '@/components/portfolio';
import { CellText, CellTitle, LedgerTable } from '@/components/LedgerTable';
export default function Properties() {
  const { data } = useLedger();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const list = data.properties.filter((p) =>
    (p.name + ' ' + p.address).toLowerCase().includes(search.trim().toLowerCase())
  );
  return (
    <Page>
      <Header
        title="Properties"
        subtitle={data.properties.length + (data.properties.length === 1 ? ' property' : ' properties') + ' in your portfolio'}
        action={
          <Action label="Add property" icon="plus" onPress={() => router.push('/properties/add')} />
        }
      />
      <Card>
        {data.properties.length > 0 && (
          <View style={{width: '100%', maxWidth: 420}}><Field
            label="Search properties"
            placeholder="Name or address"
            value={search}
            onChangeText={setSearch}
          /></View>
        )}
        {list.length ? (
          <LedgerTable name="Property directory" records={list} rowKey={p => p.id} columns={[
            {label: 'Property', share: 2.5, render: p => <CellTitle title={p.name} detail={p.address} icon={p.type === 'shop' ? 'shopping-bag' : 'home'} />},
            {label: 'Type', render: p => <CellText>{cap(p.type)}</CellText>},
            {label: 'Occupancy', render: p => <Badge tone={p.status === 'occupied' ? 'green' : p.status === 'maintenance' ? 'amber' : 'neutral'}>{cap(p.status)}</Badge>},
            {label: 'Asking rent / mo', numeric: true, render: p => <CellText amount>{money(p.monthly_rent)}</CellText>},
          ]} actions={p => <Action label="Edit property" icon="edit-2" variant="quiet"
            onPress={() => router.push({ pathname: '/properties/[id]/edit', params: { id: p.id } })} />} />
        ) : (
          <Empty
            icon="home"
            title={search ? 'No matching properties' : 'Add your first property'}
            detail={
              search
                ? 'Try another name or address.'
                : 'Start with the address and asking rent. You can assign a tenant when you create a lease.'
            }
          />
        )}
      </Card>
    </Page>
  );
}

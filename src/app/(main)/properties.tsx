import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useLedger } from '@/ledger';
import { Action, Card, Empty, Field, Header, Page } from '@/components/ui';
import { cap, money, RecordRow } from '@/components/portfolio';
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
        subtitle={data.properties.length + ' properties in your portfolio'}
        action={
          <Action label="Add property" icon="plus" onPress={() => router.push('/properties/add')} />
        }
      />
      <Card>
        {data.properties.length > 0 && (
          <Field
            label="Search properties"
            placeholder="Name or address"
            value={search}
            onChangeText={setSearch}
          />
        )}
        {list.length ? (
          list.map((p) => (
            <RecordRow
              key={p.id}
              icon={p.type === 'shop' ? 'shopping-bag' : 'home'}
              title={p.name}
              subtitle={cap(p.type) + ' · ' + p.address}
              amount={money(p.monthly_rent) + ' / mo'}
              tag={cap(p.status)}
              tone={
                p.status === 'occupied' ? 'green' : p.status === 'maintenance' ? 'amber' : 'neutral'
              }
              action={
                <Action
                  label="Edit property"
                  variant="quiet"
                  onPress={() =>
                    router.push({ pathname: '/properties/[id]/edit', params: { id: p.id } })
                  }
                />
              }
            />
          ))
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

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useLedger } from '@/ledger';
import { Action, Card, Empty, Field, Header, Page } from '@/components/ui';
import { RecordRow } from '@/components/portfolio';
export default function Tenants() {
  const { data } = useLedger();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const list = data.tenants.filter((t) =>
    [t.name, t.email, t.phone].join(' ').toLowerCase().includes(search.trim().toLowerCase())
  );
  return (
    <Page>
      <Header
        title="Tenants"
        subtitle={data.tenants.length + ' in your tenant directory'}
        action={
          <Action label="Add tenant" icon="user-plus" onPress={() => router.push('/tenants/add')} />
        }
      />
      <Card>
        {data.tenants.length > 0 && (
          <Field
            label="Search tenants"
            value={search}
            onChangeText={setSearch}
            placeholder="Name, email or phone"
          />
        )}
        {list.length ? (
          list.map((t) => (
            <RecordRow
              key={t.id}
              icon="user"
              title={t.name}
              subtitle={[t.phone, t.email, t.notes].filter(Boolean).join(' · ')}
              tag={data.properties.find((p) => p.id === t.property_id)?.name || 'No current lease'}
              tone={t.property_id ? 'green' : 'neutral'}
              action={
                <Action
                  label="Edit tenant"
                  variant="quiet"
                  onPress={() =>
                    router.push({ pathname: '/tenants/[id]/edit', params: { id: t.id } })
                  }
                />
              }
            />
          ))
        ) : (
          <Empty
            icon="users"
            title={search ? 'No matching tenants' : 'Add your first tenant'}
            detail={
              search
                ? 'Try another name or contact detail.'
                : 'Create a tenant record, then link it to a property through a lease.'
            }
          />
        )}
      </Card>
    </Page>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLedger } from '@/ledger';
import { Action, Card, Empty, Field, Header, Page } from '@/components/ui';
import { TenantStatementButton } from '@/components/RentActions';
import { CellText, CellTitle, LedgerTable } from '@/components/LedgerTable';
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
          <View style={{width: '100%', maxWidth: 420}}><Field
            label="Search tenants"
            value={search}
            onChangeText={setSearch}
            placeholder="Name, email or phone"
          /></View>
        )}
        {list.length ? (
          <LedgerTable name="Tenant directory" records={list} rowKey={t => t.id} columns={[
            {label: 'Tenant', share: 1.5, render: t => <CellTitle title={t.name} detail={t.notes ?? undefined} icon="user" />},
            {label: 'Contact', share: 1.65, render: t => <CellText>{[t.phone, t.email].filter(Boolean).join('\n') || '—'}</CellText>},
            {label: 'Property', share: 1.5, render: t => <CellText>{data.properties.find(p => p.id === t.property_id)?.name || 'No current lease'}</CellText>},
          ]} actions={t => <>
            <TenantStatementButton tenantId={t.id} />
            <Action label="Edit tenant" icon="edit-2" variant="quiet"
              onPress={() => router.push({ pathname: '/tenants/[id]/edit', params: { id: t.id } })} />
          </>} />
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

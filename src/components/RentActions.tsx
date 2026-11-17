import { useRouter } from 'expo-router';
import { Action } from '@/components/ui';
import { periodName } from '@/components/portfolio';

export function monthLabel(period: string) {
  return periodName(Number(period.slice(0, 4)), Number(period.slice(5, 7)));
}

export function CollectRentButton({ leaseId, period, amount, from, tenantId, label = 'Record payment' }: {
  leaseId: string;
  period: string;
  amount: number;
  from: 'arrears' | 'reports' | 'overview' | 'statement';
  tenantId?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <Action
      label={label}
      icon="plus"
      variant="secondary"
      onPress={() => router.push({
        pathname: '/payments/add',
        params: { lease: leaseId, month: period, amount: String(amount), from, ...(tenantId && { tenant: tenantId }) },
      })}
    />
  );
}

export function TenantStatementButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  return (
    <Action
      label="View statement"
      icon="file-text"
      variant="quiet"
      onPress={() => router.push({ pathname: '/tenants/[id]/statement', params: { id: tenantId } })}
    />
  );
}

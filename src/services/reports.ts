import { supabase } from './supabase';
import { advanceTransactionsService } from './advanceTransactions';
import { leasesService } from './leases';
import type {
  DashboardStats,
  MonthlyCollection,
  OutstandingDue,
  AdvanceUtilization,
} from '@/types';

export const reportsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: properties } = await supabase
      .from('properties')
      .select('id, status, monthly_rent')
      .eq('owner_id', user.id);

    const { data: leases } = await supabase
      .from('leases')
      .select('id, monthly_rent, advance_balance, property_id')
      .eq('owner_id', user.id)
      .eq('status', 'active');

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: currentMonthPayments } = await supabase
      .from('payments')
      .select('amount, status, lease_id')
      .eq('owner_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .eq('payment_type', 'rent');

    const totalProperties = properties?.length || 0;
    const occupiedProperties = properties?.filter(p => p.status === 'occupied').length || 0;
    const vacantProperties = properties?.filter(p => p.status === 'vacant').length || 0;
    const totalTenants = leases?.length || 0;

    const totalMonthlyRent = leases?.reduce((sum, l) => sum + l.monthly_rent, 0) || 0;
    const totalCollectedThisMonth = currentMonthPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const totalAdvanceBalance = leases?.reduce((sum, l) => sum + l.advance_balance, 0) || 0;

    const paidLeaseIds = new Set(currentMonthPayments?.filter(p => p.status === 'paid').map(p => p.lease_id) || []);
    
    let totalOutstanding = 0;
    leases?.forEach(lease => {
      if (!paidLeaseIds.has(lease.id)) {
        const partialPayment = currentMonthPayments?.find(p => p.lease_id === lease.id);
        const paidAmount = partialPayment?.amount || 0;
        totalOutstanding += lease.monthly_rent - paidAmount;
      }
    });

    const collectionRate = totalMonthlyRent > 0 ? (totalCollectedThisMonth / totalMonthlyRent) * 100 : 0;

    return {
      totalProperties,
      occupiedProperties,
      vacantProperties,
      totalTenants,
      totalDueThisMonth: totalMonthlyRent,
      totalCollectedThisMonth,
      totalOutstanding,
      totalAdvanceBalance,
      collectionRate: Math.round(collectionRate * 100) / 100,
    };
  },

  async getMonthlyCollections(year: number): Promise<MonthlyCollection[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, month, status')
      .eq('owner_id', user.id)
      .eq('year', year)
      .eq('payment_type', 'rent');

    const { data: leases } = await supabase
      .from('leases')
      .select('monthly_rent')
      .eq('owner_id', user.id)
      .eq('status', 'active');

    const totalMonthlyRent = leases?.reduce((sum, l) => sum + l.monthly_rent, 0) || 0;

    const collections: MonthlyCollection[] = [];
    for (let month = 1; month <= 12; month++) {
      const monthPayments = payments?.filter(p => p.month === month) || [];
      const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const due = totalMonthlyRent;
      const outstanding = due - collected;
      
      collections.push({
        month,
        year,
        collected,
        due,
        outstanding: Math.max(0, outstanding),
      });
    }

    return collections;
  },

  async getOutstandingDues(): Promise<OutstandingDue[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: leases } = await supabase
      .from('leases')
      .select(`
        id,
        monthly_rent,
        advance_balance,
        property:properties(name),
        tenant:tenants(name)
      `)
      .eq('owner_id', user.id)
      .eq('status', 'active');

    const { data: payments } = await supabase
      .from('payments')
      .select('lease_id, amount, status')
      .eq('owner_id', user.id)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .eq('payment_type', 'rent');

    const outstanding: OutstandingDue[] = [];
    
    leases?.forEach(lease => {
      const leasePayments = payments?.filter(p => p.lease_id === lease.id) || [];
      const totalPaid = leasePayments.reduce((sum, p) => sum + p.amount, 0);
      const amountDue = Math.max(0, lease.monthly_rent - totalPaid);
      
      if (amountDue > 0) {
        outstanding.push({
          lease_id: lease.id,
          property_name: lease.property?.name || 'Unknown',
          tenant_name: lease.tenant?.name || 'Unknown',
          months_due: 1,
          amount_due: amountDue,
          advance_balance: lease.advance_balance,
        });
      }
    });

    return outstanding.sort((a, b) => b.amount_due - a.amount_due);
  },

  async getAdvanceUtilization(): Promise<AdvanceUtilization[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: leases } = await supabase
      .from('leases')
      .select(`
        id,
        advance_paid,
        advance_balance,
        property:properties(name),
        tenant:tenants(name)
      `)
      .eq('owner_id', user.id);

    const utilization: AdvanceUtilization[] = [];

    for (const lease of leases || []) {
      const transactions = await advanceTransactionsService.getByLease(lease.id);
      const totalUsed = transactions
        .filter(t => t.transaction_type === 'debit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      utilization.push({
        lease_id: lease.id,
        property_name: lease.property?.name || 'Unknown',
        tenant_name: lease.tenant?.name || 'Unknown',
        initial_advance: lease.advance_paid,
        current_balance: lease.advance_balance,
        total_used: totalUsed,
        transactions,
      });
    }

    return utilization;
  },
};
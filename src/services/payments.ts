import { supabase } from './supabase';
import { leasesService } from './leases';
import { advanceTransactionsService } from './advanceTransactions';
import type {
  Payment,
  PaymentFormData,
  PaginatedResponse,
} from '@/types';

export const paymentsService = {
  async getAll(page = 1, pageSize = 20, filters?: { leaseId?: string; month?: number; year?: number }): Promise<PaginatedResponse<Payment>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('payments')
      .select(`
        *,
        lease:leases(*, property:properties(*), tenant:tenants(*)),
        property:properties(*),
        tenant:tenants(*)
      `, { count: 'exact' })
      .order('payment_date', { ascending: false })
      .range(from, to);

    if (filters?.leaseId) {
      query = query.eq('lease_id', filters.leaseId);
    }
    if (filters?.month) {
      query = query.eq('month', filters.month);
    }
    if (filters?.year) {
      query = query.eq('year', filters.year);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async getById(id: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        lease:leases(*, property:properties(*), tenant:tenants(*)),
        property:properties(*),
        tenant:tenants(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByLease(leaseId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        lease:leases(*, property:properties(*), tenant:tenants(*)),
        property:properties(*),
        tenant:tenants(*)
      `)
      .eq('lease_id', leaseId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getByMonthYear(month: number, year: number): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        lease:leases(*, property:properties(*), tenant:tenants(*)),
        property:properties(*),
        tenant:tenants(*)
      `)
      .eq('month', month)
      .eq('year', year)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(payment: PaymentFormData): Promise<Payment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: lease } = await supabase
      .from('leases')
      .select('property_id, tenant_id, monthly_rent, advance_balance')
      .eq('id', payment.lease_id)
      .single();

    if (!lease) throw new Error('Lease not found');

    let status: Payment['status'] = 'paid';
    let advanceUsed = 0;

    if (payment.payment_type === 'rent') {
      if (payment.amount < lease.monthly_rent) {
        status = 'partial';
        const shortfall = lease.monthly_rent - payment.amount;
        
        if (lease.advance_balance >= shortfall) {
          advanceUsed = shortfall;
          status = 'advance_used';
        } else if (lease.advance_balance > 0) {
          advanceUsed = lease.advance_balance;
          status = 'partial';
        }
      }
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        ...payment,
        owner_id: user.id,
        property_id: lease.property_id,
        tenant_id: lease.tenant_id,
        status,
      })
      .select(`
        *,
        lease:leases(*, property:properties(*), tenant:tenants(*)),
        property:properties(*),
        tenant:tenants(*)
      `)
      .single();

    if (error) throw error;

    if (advanceUsed > 0) {
      const newBalance = lease.advance_balance - advanceUsed;
      await advanceTransactionsService.create({
        lease_id: payment.lease_id,
        amount: -advanceUsed,
        transaction_type: 'debit',
        reason: `Rent shortfall - ${payment.month}/${payment.year}`,
        balance_after: newBalance,
      });
      await leasesService.updateAdvanceBalance(payment.lease_id, newBalance);
    }

    return data;
  },

  async update(id: string, updates: Partial<PaymentFormData>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        lease:leases(*, property:properties(*), tenant:tenants(*)),
        property:properties(*),
        tenant:tenants(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (payment?.status === 'advance_used' && payment.payment_type === 'rent') {
      const { data: advTx } = await supabase
        .from('advance_transactions')
        .select('*')
        .eq('lease_id', payment.lease_id)
        .eq('reason', `Rent shortfall - ${payment.month}/${payment.year}`)
        .eq('transaction_type', 'debit')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (advTx) {
        await advanceTransactionsService.delete(advTx.id);
        const { data: lease } = await supabase
          .from('leases')
          .select('advance_balance')
          .eq('id', payment.lease_id)
          .single();
        
        if (lease) {
          await leasesService.updateAdvanceBalance(payment.lease_id, lease.advance_balance + Math.abs(advTx.amount));
        }
      }
    }

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
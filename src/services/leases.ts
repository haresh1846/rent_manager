import { supabase } from './supabase';
import { advanceTransactionsService } from './advanceTransactions';
import type {
  Lease,
  LeaseFormData,
  PaginatedResponse,
} from '@/types';

export const leasesService = {
  async getAll(page = 1, pageSize = 20): Promise<PaginatedResponse<Lease>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async getById(id: string): Promise<Lease | null> {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByProperty(propertyId: string): Promise<Lease[]> {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*)
      `)
      .eq('property_id', propertyId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActiveByProperty(propertyId: string): Promise<Lease | null> {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*)
      `)
      .eq('property_id', propertyId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(lease: LeaseFormData): Promise<Lease> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('leases')
      .insert({
        ...lease,
        owner_id: user.id,
        advance_balance: lease.advance_paid,
      })
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*)
      `)
      .single();

    if (error) throw error;

    // Create initial advance transaction if advance_paid > 0
    if (lease.advance_paid > 0) {
      await advanceTransactionsService.create({
        lease_id: data.id,
        amount: lease.advance_paid,
        transaction_type: 'credit',
        reason: 'Initial advance payment',
        balance_after: lease.advance_paid,
      });
    }

    return data;
  },

  async update(id: string, updates: Partial<LeaseFormData>): Promise<Lease> {
    const { data, error } = await supabase
      .from('leases')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        tenant:tenants(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateAdvanceBalance(leaseId: string, newBalance: number): Promise<void> {
    const { error } = await supabase
      .from('leases')
      .update({ advance_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', leaseId);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('leases')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
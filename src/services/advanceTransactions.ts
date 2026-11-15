import { getSupabase } from './supabase';
import type { AdvanceTransaction } from '@/types';

export const advanceTransactionsService = {
  async getByLease(leaseId: string): Promise<AdvanceTransaction[]> {
    const { data, error } = await getSupabase()
      .from('advance_transactions')
      .select('*')
      .eq('lease_id', leaseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(transaction: Omit<AdvanceTransaction, 'id' | 'owner_id' | 'created_at' | 'lease'>): Promise<AdvanceTransaction> {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await getSupabase()
      .from('advance_transactions')
      .insert({ ...transaction, owner_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('advance_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

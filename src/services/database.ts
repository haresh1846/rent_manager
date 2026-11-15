import { getSupabase } from './supabase';
import type {
  Property,
  Tenant,
  PropertyFormData,
  TenantFormData,
  PaginatedResponse,
} from '@/types';

// ============================================
// PROPERTIES
// ============================================

export const propertiesService = {
  async getAll(page = 1, pageSize = 20): Promise<PaginatedResponse<Property>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await getSupabase()
      .from('properties')
      .select('*', { count: 'exact' })
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

  async getById(id: string): Promise<Property | null> {
    const { data, error } = await getSupabase()
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(property: PropertyFormData): Promise<Property> {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await getSupabase()
      .from('properties')
      .insert({ ...property, owner_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<PropertyFormData>): Promise<Property> {
    const { data, error } = await getSupabase()
      .from('properties')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async search(query: string): Promise<Property[]> {
    const { data, error } = await getSupabase()
      .from('properties')
      .select('*')
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

// ============================================
// TENANTS
// ============================================

export const tenantsService = {
  async getAll(page = 1, pageSize = 20): Promise<PaginatedResponse<Tenant>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await getSupabase()
      .from('tenants')
      .select('*', { count: 'exact' })
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

  async getById(id: string): Promise<Tenant | null> {
    const { data, error } = await getSupabase()
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByProperty(propertyId: string): Promise<Tenant[]> {
    const { data, error } = await getSupabase()
      .from('tenants')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(tenant: TenantFormData): Promise<Tenant> {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await getSupabase()
      .from('tenants')
      .insert({ ...tenant, owner_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<TenantFormData>): Promise<Tenant> {
    const { data, error } = await getSupabase()
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async search(query: string): Promise<Tenant[]> {
    const { data, error } = await getSupabase()
      .from('tenants')
      .select('*')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

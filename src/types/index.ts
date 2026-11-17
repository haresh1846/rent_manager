// Database types matching Supabase schema

export type PropertyType = 'shop' | 'house';
export type PropertyStatus = 'vacant' | 'occupied' | 'maintenance';
export type LeaseStatus = 'active' | 'expired' | 'terminated';
export type PaymentType = 'rent' | 'advance' | 'security_deposit' | 'maintenance' | 'other' |
  'advance_refund' | 'deposit_refund' | 'deposit_deduction';
export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'advance_used';
export type AdvanceTransactionType = 'credit' | 'debit';

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  type: PropertyType;
  address: string;
  monthly_rent: number;
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  owner_id: string;
  property_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  id_proof_type: string | null;
  id_proof_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  owner_id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  advance_paid: number;
  advance_balance: number;
  status: LeaseStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  property?: Property;
  tenant?: Tenant;
}

export interface Payment {
  id: string;
  owner_id: string;
  lease_id: string;
  property_id: string;
  tenant_id: string;
  amount: number;
  payment_type: PaymentType;
  settlement_source?: 'cash' | 'advance';
  reversal?: { reason: string; reversed_at: string };
  replaces_payment_id?: string;
  month: number;
  year: number;
  status: PaymentStatus;
  payment_date: string;
  notes: string | null;
  created_at: string;
  // Joined fields
  lease?: Lease;
  property?: Property;
  tenant?: Tenant;
}

export interface AdvanceTransaction {
  id: string;
  owner_id: string;
  lease_id: string;
  amount: number;
  transaction_type: AdvanceTransactionType;
  reason: string;
  balance_after: number;
  created_at: string;
  lease?: Lease;
}

// Form types
export interface PropertyFormData {
  name: string;
  type: PropertyType;
  address: string;
  monthly_rent: number;
  status: PropertyStatus;
}

export interface TenantFormData {
  name: string;
  phone?: string;
  email?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export interface LeaseFormData {
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date?: string;
  monthly_rent: number;
  advance_paid: number;
}

export interface PaymentFormData {
  lease_id: string;
  amount: number;
  payment_type: PaymentType;
  month: number;
  year: number;
  payment_date: string;
  notes?: string;
}

// Dashboard/Report types
export interface DashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  totalTenants: number;
  totalDueThisMonth: number;
  totalCollectedThisMonth: number;
  totalOutstanding: number;
  totalAdvanceBalance: number;
  collectionRate: number;
}

export interface MonthlyCollection {
  month: number;
  year: number;
  collected: number;
  due: number;
  outstanding: number;
}

export interface OutstandingDue {
  lease_id: string;
  property_name: string;
  tenant_name: string;
  months_due: number;
  amount_due: number;
  advance_balance: number;
}

export interface AdvanceUtilization {
  lease_id: string;
  property_name: string;
  tenant_name: string;
  initial_advance: number;
  current_balance: number;
  total_used: number;
  transactions: AdvanceTransaction[];
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

import { z } from 'zod';

export const moneySchema = z
  .number()
  .finite()
  .min(0, 'Amount cannot be negative')
  .max(9999999999.99)
  .refine((n) => Number(n.toFixed(2)) === n, 'Use at most two decimal places');
const positiveAmount = moneySchema.refine((n) => n > 0, 'Amount must be greater than zero');
const calendarDate = z.iso.date({ error: 'Enter a valid date as YYYY-MM-DD' });

export const propertySchema = z.object({
  name: z.string().trim().min(1, 'Property name is required').max(100),
  type: z.enum(['shop', 'house']),
  address: z.string().trim().min(1, 'Address is required').max(500),
  monthly_rent: moneySchema,
  status: z.enum(['vacant', 'occupied', 'maintenance']),
});

export const tenantSchema = z.object({
  name: z.string().trim().min(1, 'Tenant name is required').max(100),
  phone: z.string().optional(),
  email: z.union([z.email('Invalid email'), z.literal('')]).optional(),
  id_proof_type: z.string().optional(),
  id_proof_number: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
});

export const leaseSchema = z
  .object({
    property_id: z.string().uuid('Invalid property'),
    tenant_id: z.string().uuid('Invalid tenant'),
    start_date: calendarDate,
    end_date: z.union([calendarDate, z.literal('')]).optional(),
    monthly_rent: positiveAmount,
    advance_paid: moneySchema,
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, {
    message: 'End date must fall on or after the start date',
    path: ['end_date'],
  });

export const paymentSchema = z.object({
  lease_id: z.string().uuid('Invalid lease'),
  amount: positiveAmount,
  payment_type: z.enum(['rent', 'advance', 'security_deposit', 'maintenance', 'other']),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1900).max(9999),
  payment_date: calendarDate,
  notes: z.string().optional(),
});

export const advanceTopUpSchema = z.object({
  lease_id: z.string().uuid('Invalid lease'),
  amount: z.number().min(1, 'Amount must be positive'),
  reason: z.string().min(1, 'Reason is required'),
});

export const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type PropertyFormData = {
  name: string;
  type: 'shop' | 'house';
  address: string;
  monthly_rent: number;
  status: 'vacant' | 'occupied' | 'maintenance';
};

export type TenantFormData = {
  name: string;
  phone?: string;
  email?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
};

export type LeaseFormData = {
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date?: string;
  monthly_rent: number;
  advance_paid: number;
};

export type PaymentFormData = {
  lease_id: string;
  amount: number;
  payment_type: 'rent' | 'advance' | 'security_deposit' | 'maintenance' | 'other';
  month: number;
  year: number;
  payment_date: string;
  notes?: string;
};

export type AdvanceTopUpFormData = {
  lease_id: string;
  amount: number;
  reason: string;
};

export type AuthFormData = {
  email: string;
  password: string;
};

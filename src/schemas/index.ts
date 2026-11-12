import { z } from 'zod';

export const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100),
  type: z.enum(['shop', 'house']),
  address: z.string().min(1, 'Address is required').max(500),
  monthly_rent: z.number().min(0, 'Rent must be positive'),
  status: z.enum(['vacant', 'occupied', 'maintenance']),
});

export const tenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(100),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  id_proof_type: z.string().optional(),
  id_proof_number: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
});

export const leaseSchema = z.object({
  property_id: z.string().uuid('Invalid property'),
  tenant_id: z.string().uuid('Invalid tenant'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  monthly_rent: z.number().min(1, 'Monthly rent must be positive'),
  advance_paid: z.number().min(0, 'Advance cannot be negative'),
});

export const paymentSchema = z.object({
  lease_id: z.string().uuid('Invalid lease'),
  amount: z.number().min(1, 'Amount must be positive'),
  payment_type: z.enum(['rent', 'advance', 'security_deposit', 'maintenance', 'other']),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  payment_date: z.string().min(1, 'Payment date is required'),
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

export type PropertyFormData = z.infer<typeof propertySchema>;
export type TenantFormData = z.infer<typeof tenantSchema>;
export type LeaseFormData = z.infer<typeof leaseSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type AdvanceTopUpFormData = z.infer<typeof advanceTopUpSchema>;
export type AuthFormData = z.infer<typeof authSchema>;
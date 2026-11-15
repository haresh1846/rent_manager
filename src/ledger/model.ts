import type {
  Lease,
  LeaseFormData,
  Payment,
  PaymentFormData,
  Property,
  PropertyFormData,
  Tenant,
  TenantFormData,
} from '../types/index';
import { leaseSchema, paymentSchema, propertySchema, tenantSchema } from '../schemas/index.ts';

export interface MaintenanceInput {
  property_id: string;
  title: string;
  description?: string;
}
export interface Maintenance extends MaintenanceInput {
  id: string;
  owner_id: string;
  status: 'open' | 'resolved';
  created_at: string;
}
export interface Ledger {
  properties: Property[];
  tenants: Tenant[];
  leases: Lease[];
  payments: Payment[];
  maintenance: Maintenance[];
}
export type Command =
  | { kind: 'property'; input: PropertyFormData }
  | { kind: 'tenant'; input: TenantFormData }
  | { kind: 'update_property'; input: PropertyFormData & { id: string; expected_updated_at?: string } }
  | { kind: 'update_tenant'; input: TenantFormData & { id: string; expected_updated_at?: string } }
  | { kind: 'lease'; input: LeaseFormData }
  | { kind: 'end_lease'; input: { id: string; end_date: string } }
  | { kind: 'payment' | 'apply_advance'; input: PaymentFormData }
  | { kind: 'maintenance'; input: MaintenanceInput }
  | { kind: 'maintenance_status'; input: { id: string; status: Maintenance['status'] } };

export function emptyLedger(): Ledger {
  return { properties: [], tenants: [], leases: [], payments: [], maintenance: [] };
}

export function localDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function cents(amount: number) {
  return Math.round(amount * 100);
}
function nextRevision(previous: string, now: Date) {
  return new Date(Math.max(now.getTime(), Date.parse(previous) + 1)).toISOString();
}
function belongsToPeriod(lease: Lease, period: string) {
  return (
    lease.start_date.slice(0, 7) <= period &&
    (lease.end_date ? lease.end_date.slice(0, 7) >= period : lease.status !== 'terminated')
  );
}

// Each calendar month touched by a lease carries one installment of its agreed rent.
export function calculateMonth(data: Ledger, year: number, month: number) {
  const period = year + '-' + String(month).padStart(2, '0');
  const settlements = new Map<string, number>();
  let applied = 0;
  for (const receipt of data.payments) {
    if (
      receipt.year !== year ||
      receipt.month !== month ||
      receipt.payment_type !== 'rent' ||
      receipt.status === 'pending'
    )
      continue;
    settlements.set(receipt.lease_id, (settlements.get(receipt.lease_id) ?? 0) + cents(receipt.amount));
    if (
      receipt.settlement_source === 'advance' ||
      (!receipt.settlement_source && receipt.status === 'advance_used')
    )
      applied += cents(receipt.amount);
  }
  const properties = new Map(data.properties.map((p) => [p.id, p]));
  const tenants = new Map(data.tenants.map((t) => [t.id, t]));
  const rows = data.leases
    .filter((l) => belongsToPeriod(l, period))
    .flatMap((lease) => {
      const property = properties.get(lease.property_id);
      const tenant = tenants.get(lease.tenant_id);
      if (!property || !tenant) return [];
      const collected = settlements.get(lease.id) ?? 0;
      return [
        {
          lease,
          property,
          tenant,
          due: lease.monthly_rent,
          collected: collected / 100,
          outstanding: Math.max(0, cents(lease.monthly_rent) - collected) / 100,
        },
      ];
    });
  const due = rows.reduce((sum, r) => sum + cents(r.due), 0) / 100;
  const collected = rows.reduce((sum, r) => sum + cents(r.collected), 0) / 100;
  const outstanding = rows.reduce((sum, r) => sum + cents(r.outstanding), 0) / 100;
  const occupied = new Set(rows.map((r) => r.property.id)).size;
  return {
    rows,
    due,
    collected,
    outstanding,
    occupied,
    occupancy: data.properties.length ? Math.round((100 * occupied) / data.properties.length) : 0,
    cashCollected: (cents(collected) - applied) / 100,
    advanceApplied: applied / 100,
    advanceBalance: data.leases.reduce((sum, l) => sum + cents(l.advance_balance), 0) / 100,
  };
}

export function presentLedger(data: Ledger, today = localDate()): Ledger {
  const leases = data.leases.map((l) =>
    l.end_date && l.end_date < today && l.status === 'active' ? { ...l, status: 'expired' as const } : l
  );
  const active = leases.filter((l) => isLeaseCurrent(l, today));
  const occupied = new Set(active.map((l) => l.property_id));
  const tenants = new Map(active.map((l) => [l.tenant_id, l.property_id]));
  return {
    ...data,
    leases,
    properties: data.properties.map((p) => ({
      ...p,
      status: occupied.has(p.id) ? 'occupied' : p.status === 'occupied' ? 'vacant' : p.status,
    })),
    tenants: data.tenants.map((t) => ({ ...t, property_id: tenants.get(t.id) ?? null })),
  };
}

export function isLeaseCurrent(lease: Lease, date = localDate()) {
  if (date < lease.start_date) return false;
  if (lease.status === 'terminated') return Boolean(lease.end_date && date < lease.end_date);
  return !lease.end_date || date <= lease.end_date;
}

export function applyCommand(
  data: Ledger,
  command: Command,
  owner: string,
  id: string,
  now = new Date()
): Ledger {
  const timestamp = now.toISOString();
  const record = { id, owner_id: owner, created_at: timestamp };
  switch (command.kind) {
    case 'property': {
      const input = propertySchema.parse(command.input);
      if (input.status === 'occupied') throw new Error('Create a lease to mark a property as occupied.');
      return { ...data, properties: [{ ...record, ...input, updated_at: timestamp }, ...data.properties] };
    }
    case 'update_property': {
      const original = data.properties.find((p) => p.id === command.input.id && p.owner_id === owner);
      if (!original) throw new Error('Property not found.');
      if (command.input.expected_updated_at && command.input.expected_updated_at !== original.updated_at) {
        throw new Error('This property changed. Refresh the workspace and try again.');
      }
      const input = propertySchema.parse({ ...command.input, status: original.status });
      const updated = { ...original, ...input, updated_at: nextRevision(original.updated_at, now) };
      return { ...data, properties: data.properties.map((p) => (p.id === original.id ? updated : p)) };
    }
    case 'tenant': {
      const input = tenantSchema.parse(command.input);
      const tenant = {
        ...record,
        updated_at: timestamp,
        property_id: null,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        notes: input.notes || null,
        id_proof_type: input.id_proof_type || null,
        id_proof_number: input.id_proof_number || null,
        emergency_contact_name: input.emergency_contact_name || null,
        emergency_contact_phone: input.emergency_contact_phone || null,
      };
      return { ...data, tenants: [tenant, ...data.tenants] };
    }
    case 'update_tenant': {
      const original = data.tenants.find((t) => t.id === command.input.id && t.owner_id === owner);
      if (!original) throw new Error('Tenant not found.');
      if (command.input.expected_updated_at && command.input.expected_updated_at !== original.updated_at) {
        throw new Error('This tenant changed. Refresh the workspace and try again.');
      }
      const input = tenantSchema.parse(command.input);
      const updated = { ...original, name: input.name, updated_at: nextRevision(original.updated_at, now) };
      for (const key of [
        'phone',
        'email',
        'notes',
        'id_proof_type',
        'id_proof_number',
        'emergency_contact_name',
        'emergency_contact_phone',
      ] as const) {
        if (input[key] !== undefined) updated[key] = input[key] || null;
      }
      return { ...data, tenants: data.tenants.map((t) => (t.id === original.id ? updated : t)) };
    }
    case 'lease': {
      const input = leaseSchema.parse(command.input);
      const property = data.properties.find((p) => p.id === input.property_id);
      if (!property || !data.tenants.some((t) => t.id === input.tenant_id))
        throw new Error('Choose an existing property and tenant.');
      if (property.status === 'maintenance') throw new Error('This property is under maintenance.');
      const conflict = data.leases.some(
        (l) =>
          (l.property_id === input.property_id || l.tenant_id === input.tenant_id) &&
          (l.end_date || l.status !== 'terminated') &&
          (!l.end_date ||
            (l.status === 'terminated' ? l.end_date > input.start_date : l.end_date >= input.start_date)) &&
          (!input.end_date || l.start_date <= input.end_date)
      );
      if (conflict) throw new Error('This property or tenant already has a lease during those dates.');
      const lease: Lease = {
        ...record,
        ...input,
        end_date: input.end_date || null,
        advance_balance: input.advance_paid,
        status: 'active',
        updated_at: timestamp,
      };
      return { ...data, leases: [lease, ...data.leases] };
    }
    case 'payment':
    case 'apply_advance': {
      const input = paymentSchema.parse(command.input);
      const lease = data.leases.find((l) => l.id === input.lease_id);
      if (!lease) throw new Error('Choose an existing lease.');
      const credit = command.kind === 'apply_advance';
      if (credit && input.payment_type !== 'rent') throw new Error('Advances can only be applied to rent.');
      const amount = cents(input.amount);
      let balance = cents(lease.advance_balance);
      let status: Payment['status'] = 'paid';
      if (input.payment_type === 'rent') {
        const period = input.year + '-' + String(input.month).padStart(2, '0');
        if (!belongsToPeriod(lease, period)) throw new Error('Choose a rent month within the lease dates.');
        const settled = data.payments
          .filter(
            (p) =>
              p.lease_id === lease.id &&
              p.year === input.year &&
              p.month === input.month &&
              p.payment_type === 'rent' &&
              p.status !== 'pending'
          )
          .reduce((sum, p) => sum + cents(p.amount), 0);
        if (settled + amount > cents(lease.monthly_rent))
          throw new Error('Amount exceeds the rent outstanding for this month.');
        status = settled + amount === cents(lease.monthly_rent) ? 'paid' : 'partial';
        if (credit) {
          if (amount > balance) throw new Error('Amount exceeds the available advance.');
          balance -= amount;
          status = 'advance_used';
        }
      } else if (input.payment_type === 'advance') {
        balance += amount;
        if (balance > 999999999999) throw new Error('Advance balance exceeds the supported amount.');
      }
      const payment: Payment = {
        ...record,
        ...input,
        property_id: lease.property_id,
        tenant_id: lease.tenant_id,
        notes: input.notes || null,
        status,
        settlement_source: credit ? 'advance' : 'cash',
      };
      return {
        ...data,
        payments: [payment, ...data.payments],
        leases: data.leases.map((l) =>
          l.id === lease.id ? { ...l, advance_balance: balance / 100, updated_at: timestamp } : l
        ),
      };
    }
    case 'end_lease': {
      const { id: leaseId, end_date } = command.input;
      const lease = data.leases.find((l) => l.id === leaseId);
      if (!lease || lease.status === 'terminated') throw new Error('Choose an open lease.');
      leaseSchema.parse({ ...lease, end_date });
      if (!end_date || end_date > localDate(now))
        throw new Error('Choose a move-out date on or before today.');
      if (lease.end_date && end_date > lease.end_date) throw new Error('Move-out cannot extend a lease.');
      const billedAfter = data.payments.some(
        (p) =>
          p.lease_id === leaseId &&
          p.payment_type === 'rent' &&
          p.year + '-' + String(p.month).padStart(2, '0') > end_date.slice(0, 7)
      );
      if (billedAfter) throw new Error('Rent is already recorded after that move-out month.');
      return {
        ...data,
        leases: data.leases.map((l) =>
          l.id === leaseId ? { ...l, end_date, status: 'terminated', updated_at: timestamp } : l
        ),
      };
    }
    case 'maintenance': {
      const { property_id, title, description } = command.input;
      if (!data.properties.some((p) => p.id === property_id))
        throw new Error('Choose an existing property.');
      if (!title.trim() || title.trim().length > 160)
        throw new Error('Enter a maintenance title of 1–160 characters.');
      if ((description || '').length > 2000)
        throw new Error('Keep the description under 2,000 characters.');
      return {
        ...data,
        maintenance: [
          {
            ...record,
            property_id,
            title: title.trim(),
            description: description?.trim() || '',
            status: 'open',
          },
          ...data.maintenance,
        ],
      };
    }
    case 'maintenance_status': {
      const { id: ticketId, status } = command.input;
      if (status !== 'open' && status !== 'resolved') throw new Error('Invalid maintenance status.');
      if (!data.maintenance.some((m) => m.id === ticketId))
        throw new Error('Maintenance request not found.');
      return {
        ...data,
        maintenance: data.maintenance.map((m) => (m.id === ticketId ? { ...m, status } : m)),
      };
    }
  }
}

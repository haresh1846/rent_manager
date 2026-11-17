import { z } from 'zod';
import type { LocalWorkspace } from '../providers';
import { leaseSchema, moneySchema, paymentSchema, propertySchema, tenantSchema } from '../schemas/index.ts';
import type { Lease, Payment, Tenant } from '../types';
import {
  advanceMovement, belongsToPeriod, depositMovement, isPostedPayment, usesAdvance, type Ledger,
} from './model.ts';

const format = 'rent-manager-ledger';
// Older readers treated every receipt as active, so files containing reversals need a new version.
const version = 2;
const timestamp = z.iso.datetime({ offset: true });
const envelope = z.object({
  format: z.literal(format),
  version: z.number().int(),
  exportedAt: timestamp,
  workspace: z.enum(['personal', 'demo']),
  ledger: z.unknown(),
});

function recordSchemas(workspace: LocalWorkspace) {
  const id = z.uuid();
  const identity = { id, owner_id: z.literal('local-' + workspace), created_at: timestamp };
  const property = propertySchema.extend({ ...identity, updated_at: timestamp });
  const textOrNull = z.string().nullable();
  const tenant = z.object({
    ...identity,
    updated_at: timestamp,
    name: tenantSchema.shape.name,
    property_id: id.nullable(),
    phone: textOrNull,
    email: tenantSchema.shape.email.unwrap().nullable(),
    notes: textOrNull,
    id_proof_type: textOrNull,
    id_proof_number: textOrNull,
    emergency_contact_name: textOrNull,
    emergency_contact_phone: textOrNull,
  });
  const lease = z
    .object({
      ...identity,
      ...leaseSchema.shape,
      updated_at: timestamp,
      end_date: z.iso.date().nullable(),
      advance_balance: moneySchema,
      status: z.enum(['active', 'expired', 'terminated']),
      property: property.optional(),
      tenant: tenant.optional(),
    })
    .refine((l) => l.end_date === null || l.end_date >= l.start_date, {
      message: 'End date precedes the start date.',
      path: ['end_date'],
    });
  const payment = z.object({
    ...identity,
    ...paymentSchema.shape,
    notes: textOrNull,
    property_id: id,
    tenant_id: id,
    status: z.enum(['paid', 'partial', 'pending', 'advance_used']),
    settlement_source: z.enum(['cash', 'advance']).optional(),
    reversal: z.object({ reason: z.string().trim().min(1).max(500), reversed_at: timestamp }).optional(),
    replaces_payment_id: id.optional(),
    lease: lease.optional(),
    property: property.optional(),
    tenant: tenant.optional(),
  });
  const maintenance = z.object({
    ...identity,
    property_id: id,
    title: z.string().trim().min(1).max(160),
    description: z.string().max(2000).optional(),
    status: z.enum(['open', 'resolved']),
  });
  return z.strictObject({
    properties: z.array(property),
    tenants: z.array(tenant),
    leases: z.array(lease),
    payments: z.array(payment),
    maintenance: z.array(maintenance),
  });
}

function indexRecords<T extends { id: string }>(rows: T[], name: string) {
  const index = new Map(rows.map((row) => [row.id, row]));
  if (index.size !== rows.length) throw new Error('Duplicate record IDs in ' + name + '.');
  return index;
}

function checkPaymentHistory(
  payments: Map<string, Payment>,
  leases: Map<string, Lease>,
  describe: (lease: Lease) => string,
) {
  const settlements = new Map<string, number>();
  const fundChanges = new Map<string, Map<string, { advance: bigint; deposit: bigint }>>();
  const replacements = new Set<string>();
  for (const payment of payments.values()) {
    const lease = leases.get(payment.lease_id)!;
    const period = payment.year + '-' + String(payment.month).padStart(2, '0');
    const label = describe(lease) + ' (' + period + ')';
    if (payment.replaces_payment_id) {
      const original = payments.get(payment.replaces_payment_id);
      if (!original?.reversal || replacements.has(original.id)) {
        throw new Error(label + ' has a replacement without a uniquely reversed original payment.');
      }
      replacements.add(original.id);
    }
    const fromAdvance = usesAdvance(payment);
    if ((fromAdvance && payment.payment_type !== 'rent') ||
        (payment.payment_type === 'deposit_deduction' && payment.settlement_source !== undefined) ||
        (payment.status === 'advance_used' && payment.settlement_source === 'cash')) {
      throw new Error(label + ' has conflicting cash and advance records.');
    }
    if (payment.payment_type === 'deposit_deduction' && !payment.notes?.trim()) {
      throw new Error(label + ' has a deposit deduction without a reason.');
    }
    if (!isPostedPayment(payment)) continue;
    const amount = Math.round(payment.amount * 100);
    if (payment.payment_type === 'rent') {
      if (!belongsToPeriod(lease, period)) {
        throw new Error(label + ' has rent recorded outside the lease dates.');
      }
      const key = lease.id + '/' + period;
      const total = (settlements.get(key) ?? 0) + amount;
      if (total > Math.round(lease.monthly_rent * 100)) {
        throw new Error(label + ' has rent payments above the agreed monthly rent of ₹' +
          lease.monthly_rent.toLocaleString('en-IN') + '.');
      }
      settlements.set(key, total);
    }
    const advance = advanceMovement(payment);
    const deposit = depositMovement(payment);
    if (advance || deposit) {
      let days = fundChanges.get(lease.id);
      if (!days) {
        days = new Map();
        fundChanges.set(lease.id, days);
      }
      const day = days.get(payment.payment_date) ?? { advance: BigInt(0), deposit: BigInt(0) };
      day.advance += BigInt(Math.round(advance * 100));
      day.deposit += BigInt(Math.round(deposit * 100));
      days.set(payment.payment_date, day);
    }
  }
  for (const lease of leases.values()) {
    let advance = BigInt(Math.round(lease.advance_paid * 100));
    let deposit = BigInt(0);
    const days = fundChanges.get(lease.id);
    if (days) {
      for (const date of [...days.keys()].sort()) {
        const change = days.get(date)!;
        advance += change.advance;
        deposit += change.deposit;
        if (advance < 0) throw new Error(describe(lease) + ' has a negative advance balance on ' + date + '.');
        if (deposit < 0) throw new Error(describe(lease) + ' has more deposit refunds and deductions than deposits received on ' + date + '.');
        if (advance > 999999999999 || deposit > 999999999999) {
          throw new Error(describe(lease) + ' exceeds the supported balance on ' + date + '.');
        }
      }
    }
    if (advance !== BigInt(Math.round(lease.advance_balance * 100))) {
      throw new Error(describe(lease) +
        ' has an advance balance that does not match its opening advance, top-ups, applications and refunds.');
    }
  }
  // Check each replacement chain once. Its linked original may appear anywhere in the file.
  const checked = new Set<string>();
  for (const payment of payments.values()) {
    const path = new Set<string>();
    let current = payment;
    while (current.replaces_payment_id && !checked.has(current.id)) {
      if (path.has(current.id)) throw new Error('The backup contains a circular payment replacement.');
      path.add(current.id);
      current = payments.get(current.replaces_payment_id)!;
    }
    for (const id of path) checked.add(id);
  }
}

function validateLedger(value: unknown, workspace: LocalWorkspace): asserts value is Ledger {
  const result = recordSchemas(workspace).safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = ['ledger', ...issue.path].join('.');
    throw new Error('Invalid backup field ' + field + '. ' + issue.message);
  }
  const data = result.data;
  const properties = indexRecords(data.properties, 'properties');
  const tenants = indexRecords(data.tenants, 'tenants');
  const leases = indexRecords(data.leases, 'leases');
  const payments = indexRecords(data.payments, 'payments');
  indexRecords(data.maintenance, 'maintenance');

  function checkTenant(t: Tenant) {
    if (t.property_id !== null && !properties.has(t.property_id)) {
      throw new Error('A tenant references a missing property.');
    }
  }
  function checkParties(record: Lease | Payment) {
    if (!properties.has(record.property_id) || !tenants.has(record.tenant_id)) {
      throw new Error('A lease or payment references a missing property or tenant.');
    }
    if (
      (record.property && record.property.id !== record.property_id) ||
      (record.tenant && record.tenant.id !== record.tenant_id)
    ) {
      throw new Error('An attached property or tenant has a mismatched ID.');
    }
    if (record.tenant) checkTenant(record.tenant);
  }
  data.tenants.forEach(checkTenant);
  data.leases.forEach(checkParties);
  for (const payment of data.payments) {
    checkParties(payment);
    const lease = leases.get(payment.lease_id);
    if (!lease || lease.tenant_id !== payment.tenant_id || lease.property_id !== payment.property_id) {
      throw new Error('A payment does not match its lease, property and tenant.');
    }
    if (payment.lease) {
      checkParties(payment.lease);
      if (
        payment.lease.id !== lease.id ||
        payment.lease.tenant_id !== lease.tenant_id ||
        payment.lease.property_id !== lease.property_id
      ) {
        throw new Error('A payment includes a mismatched lease.');
      }
    }
  }
  if (data.maintenance.some((ticket) => !properties.has(ticket.property_id))) {
    throw new Error('A maintenance request references a missing property.');
  }
  checkPaymentHistory(payments, leases, (lease) =>
    tenants.get(lease.tenant_id)!.name + ' at ' + properties.get(lease.property_id)!.name
  );
}

export interface LedgerBackup {
  format: typeof format;
  version: 1 | typeof version;
  workspace: LocalWorkspace;
  exportedAt: string;
  ledger: Ledger;
}

export function createBackup(workspace: LocalWorkspace, ledger: Ledger): string {
  validateLedger(ledger, workspace);
  const backup: LedgerBackup = { format, version, workspace, exportedAt: new Date().toISOString(), ledger };
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(text: string, expectedWorkspace: LocalWorkspace): LedgerBackup {
  let source: unknown;
  try {
    source = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('The backup file contains invalid JSON.');
  }
  const header = envelope.safeParse(source);
  if (!header.success) throw new Error('The file is missing a valid Rentfold backup header.');
  const { workspace, exportedAt, ledger, version: fileVersion } = header.data;
  if (fileVersion !== 1 && fileVersion !== version)
    throw new Error('Unsupported Rentfold backup version ' + fileVersion + '.');
  if (workspace !== expectedWorkspace) {
    const target = workspace === 'demo' ? 'sample' : 'personal';
    throw new Error(
      'This backup belongs to the ' + target + ' workspace. Switch workspaces to restore it.'
    );
  }
  validateLedger(ledger, workspace);
  // Keep the original JSON records. Form validators trim names and strip unknown metadata.
  return { format, version: fileVersion, workspace, exportedAt, ledger };
}

import { z } from 'zod';
import type { LocalWorkspace } from '../providers';
import { leaseSchema, moneySchema, paymentSchema, propertySchema, tenantSchema } from '../schemas/index.ts';
import type { Lease, Payment, Tenant } from '../types';
import type { Ledger } from './model';

const format = 'rent-manager-ledger';
const version = 1;
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
  indexRecords(data.payments, 'payments');
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
}

export interface LedgerBackup {
  format: typeof format;
  version: typeof version;
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
  if (!header.success) throw new Error('The file is missing a valid Rent Manager backup header.');
  const { workspace, exportedAt, ledger } = header.data;
  if (header.data.version !== version)
    throw new Error('Unsupported Rent Manager backup version ' + header.data.version + '.');
  if (workspace !== expectedWorkspace) {
    const target = workspace === 'demo' ? 'sample' : 'personal';
    throw new Error(
      'This backup belongs to the ' + target + ' workspace. Switch workspaces to restore it.'
    );
  }
  validateLedger(ledger, workspace);
  // Keep the original JSON records. Form validators trim names and strip unknown metadata.
  return { format, version, workspace, exportedAt, ledger };
}

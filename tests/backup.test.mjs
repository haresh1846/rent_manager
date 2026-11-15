import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBackup, parseBackup } from '../src/ledger/backup.ts';
import { createDemoLedger } from '../src/ledger/demo.ts';
import { applyCommand, calculateMonth, emptyLedger } from '../src/ledger/model.ts';

const date = new Date('2026-11-10T12:00:00Z');
const owner = 'local-demo';
const id = (n) => 'f0000000-0000-4000-8000-' + String(n).padStart(12, '0');
const seed = () => createDemoLedger(date);

test('backup round-trips the exact raw records, optional fields, and legacy advance receipts', () => {
  let data = seed();
  const lease = data.leases[0];
  data = applyCommand(
    data,
    {
      kind: 'apply_advance',
      input: {
        lease_id: lease.id,
        amount: 0.01,
        payment_type: 'rent',
        payment_date: '2026-11-10',
        year: 2026,
        month: 11,
      },
    },
    owner,
    id(1),
    date
  );
  const receipt = data.payments[0];
  delete receipt.settlement_source;
  receipt.notes = 'First line\n  दूसरी पंक्ति  ';
  data.tenants[0].id_proof_type = 'Other';
  data.tenants[0].emergency_contact_name = 'Original contact';
  data.properties[0].name = '  Historical name  ';
  data.properties[0].retained_metadata = { imported: true };
  receipt.lease = structuredClone(data.leases[0]);
  receipt.property = structuredClone(data.properties.find((p) => p.id === receipt.property_id));
  const original = structuredClone(data);
  const text = createBackup('demo', data);
  const parsed = parseBackup('\uFEFF' + text, 'demo');
  assert.equal(parsed.version, 1);
  assert.equal(parsed.workspace, 'demo');
  assert.equal(parsed.exportedAt, new Date(parsed.exportedAt).toISOString());
  assert.deepEqual(parsed.ledger, original);
  assert.deepEqual(data, original);
  assert.deepEqual(calculateMonth(parsed.ledger, 2026, 11), calculateMonth(original, 2026, 11));
});

test('both local workspaces round-trip independently and cannot restore each other’s records', () => {
  const empty = createBackup('personal', emptyLedger());
  assert.deepEqual(parseBackup(empty, 'personal').ledger, emptyLedger());
  assert.throws(() => parseBackup(empty, 'demo'), /personal workspace/);
  const personal = applyCommand(
    emptyLedger(),
    { kind: 'tenant', input: { name: 'Local resident' } },
    'local-personal',
    id(10),
    date
  );
  assert.deepEqual(parseBackup(createBackup('personal', personal), 'personal').ledger, personal);
  const backup = createBackup('demo', seed());
  assert.throws(() => parseBackup(backup, 'personal'), /sample workspace/);
  assert.throws(() => createBackup('personal', seed()), /owner_id/);
  const mislabeled = JSON.parse(backup);
  mislabeled.workspace = 'personal';
  assert.throws(() => parseBackup(JSON.stringify(mislabeled), 'personal'), /owner_id/);
});

test('rejects incomplete, unrelated and unsupported file formats before restore', () => {
  const source = JSON.parse(createBackup('demo', seed()));
  assert.throws(() => parseBackup('{', 'demo'), /invalid JSON/);
  for (const value of [
    null,
    [],
    {},
    { ...source, format: 'another-app' },
    { ...source, exportedAt: 'yesterday' },
  ]) {
    assert.throws(() => parseBackup(JSON.stringify(value), 'demo'), /header/);
  }
  assert.throws(() => parseBackup(JSON.stringify({ ...source, version: 2 }), 'demo'), /version 2/);
  for (const ledger of [
    null,
    {},
    { ...source.ledger, payments: {} },
    { ...source.ledger, tenants: undefined },
  ]) {
    assert.throws(() => parseBackup(JSON.stringify({ ...source, ledger }), 'demo'), /Invalid backup field/);
  }
});

test('rejects invalid fields, ownership, amounts, and duplicate identifiers', () => {
  for (const change of [
    (d) => {
      d.payments[0].amount = 0.001;
    },
    (d) => {
      d.payments[0].amount = '8000';
    },
    (d) => {
      d.payments[0].settlement_source = 'unknown';
    },
    (d) => {
      d.leases[0].advance_balance = -1;
    },
    (d) => {
      d.leases[0].end_date = '2025-01-01';
    },
    (d) => {
      d.tenants[0].owner_id = 'local-personal';
    },
    (d) => {
      d.properties[0].updated_at = '2026-02-30T00:00:00Z';
    },
    (d) => {
      d.tenants[0].id = 'invalid';
    },
    (d) => {
      d.payments[0].month = 13;
    },
    (d) => {
      d.payments[0].status = 'unrecognized';
    },
    (d) => {
      d.properties.push(structuredClone(d.properties[0]));
    },
  ]) {
    const backup = JSON.parse(createBackup('demo', seed()));
    change(backup.ledger);
    assert.throws(
      () => parseBackup(JSON.stringify(backup), 'demo'),
      /Invalid backup field|Duplicate record/
    );
  }
});

test('rejects dangling and mismatched links, including joined snapshots', () => {
  const source = applyCommand(
    seed(),
    { kind: 'maintenance', input: { property_id: seed().properties[0].id, title: 'Tap repair' } },
    owner,
    id(5),
    date
  );
  for (const change of [
    (d) => {
      d.maintenance[0].property_id = id(42);
    },
    (d) => {
      d.tenants[0].property_id = id(42);
    },
    (d) => {
      d.leases[0].tenant_id = id(42);
    },
    (d) => {
      d.payments[0].lease_id = id(42);
    },
    (d) => {
      d.payments[0].tenant_id = d.tenants.find((t) => t.id !== d.payments[0].tenant_id).id;
    },
    (d) => {
      d.payments[0].lease = d.leases.find((l) => l.id !== d.payments[0].lease_id);
    },
    (d) => {
      d.leases[0].property = d.properties.find((p) => p.id !== d.leases[0].property_id);
    },
    (d) => {
      d.leases[0].tenant = {
        ...d.tenants.find((t) => t.id === d.leases[0].tenant_id),
        owner_id: 'local-personal',
      };
    },
  ]) {
    const backup = JSON.parse(createBackup('demo', source));
    change(backup.ledger);
    assert.throws(() => parseBackup(JSON.stringify(backup), 'demo'), /missing|match|owner_id/);
  }
});

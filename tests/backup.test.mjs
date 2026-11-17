import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBackup, parseBackup } from '../src/ledger/backup.ts';
import { createDemoLedger } from '../src/ledger/demo.ts';
import { applyCommand, calculateMonth, emptyLedger } from '../src/ledger/model.ts';
import { createNativeLedgerStore, UnreadableLedgerError } from '../src/ledger/workspace.ts';

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
  assert.equal(parsed.version, 2);
  assert.equal(parsed.workspace, 'demo');
  assert.equal(parsed.exportedAt, new Date(parsed.exportedAt).toISOString());
  assert.deepEqual(parsed.ledger, original);
  assert.deepEqual(data, original);
  const legacy = { ...JSON.parse(text), version: 1 };
  assert.deepEqual(parseBackup(JSON.stringify(legacy), 'demo').ledger, original);
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
  assert.throws(() => parseBackup(JSON.stringify({ ...source, version: 3 }), 'demo'), /version 3/);
  for (const ledger of [
    null,
    {},
    { ...source.ledger, payments: {} },
    { ...source.ledger, tenants: undefined },
  ]) {
    assert.throws(() => parseBackup(JSON.stringify({ ...source, ledger }), 'demo'), /Invalid backup field/);
  }
});

test('rejects impossible rent totals, billing months, and inconsistent advances with tenant context', () => {
  const source = JSON.parse(createBackup('demo', seed()));
  function altered(change) {
    const backup = structuredClone(source);
    change(backup.ledger);
    return () => parseBackup(JSON.stringify(backup), 'demo');
  }
  assert.throws(altered((d) => d.payments.push({ ...d.payments[0], id: id(70), amount: 12000.01 })),
    /Arun Rao at Market Road Studio \(2026-11\).*above the agreed/);
  assert.throws(altered((d) => { d.payments[0].month = 10; }),
    /Arun Rao.*2026-10.*outside the lease/);
  assert.throws(altered((d) => { d.leases[0].advance_balance -= 1; }),
    /Arun Rao.*advance balance/);
  assert.throws(altered((d) => { d.payments[0].status = 'advance_used'; }),
    /Arun Rao.*conflicting/);
  assert.throws(altered((d) => { d.payments[0].payment_type = 'deposit_refund'; }),
    /Arun Rao.*more deposit refunds/);
  assert.throws(altered((d) => {
    const payment = d.payments[0];
    d.payments.push({ ...payment, id: id(71), payment_type: 'deposit_refund', payment_date: '2026-11-03' });
    d.payments.push({ ...payment, id: id(72), payment_type: 'security_deposit', payment_date: '2026-11-09' });
  }), /Arun Rao.*deposit.*2026-11-03/);
});

test('preserves reversed receipts and validates replacements independently of file order', () => {
  const d = seed();
  const original = d.payments[0];
  const replacement = { ...original, id: id(75), amount: 24000, replaces_payment_id: original.id };
  original.reversal = { reason: 'Corrected receipt amount', reversed_at: date.toISOString() };
  d.payments.push(replacement);
  const text = createBackup('demo', d);
  assert.deepEqual(parseBackup(text, 'demo').ledger, d);
  const duplicate = JSON.parse(text);
  duplicate.ledger.payments.push({ ...replacement, id: id(76), amount: 1 });
  assert.throws(() => parseBackup(JSON.stringify(duplicate), 'demo'), /uniquely reversed/);
  delete original.reversal;
  assert.throws(() => createBackup('demo', d), /uniquely reversed/);
  original.reversal = replacement.reversal = { reason: 'Repair', reversed_at: date.toISOString() };
  original.replaces_payment_id = replacement.id;
  assert.throws(() => createBackup('demo', d), /circular/);
});

test('a real move-out with deposit deductions, refunds and a corrected receipt round-trips', () => {
  let data = seed();
  const lease = data.leases[0];
  const post = (n, type, amount, day = '2026-11-10', notes) => {
    data = applyCommand(data, {
      kind: 'payment',
      input: { lease_id: lease.id, payment_type: type, amount, payment_date: day, year: 2026, month: 11, notes },
    }, owner, id(n), date);
  };
  post(80, 'security_deposit', 7000, '2026-11-02');
  data = applyCommand(data, { kind: 'end_lease', input: { id: lease.id, end_date: '2026-11-10' } },
    owner, id(81), date);
  post(82, 'deposit_deduction', 500, '2026-11-10', 'Key replacement');
  post(83, 'deposit_refund', 6500);
  post(84, 'advance_refund', 1000);
  data = applyCommand(data, { kind: 'reverse_payment', input: { id: id(84), reason: 'Incorrect refund' } },
    owner, id(85), date);
  data = applyCommand(data, {
    kind: 'payment', replaces: id(84),
    input: { lease_id: lease.id, payment_type: 'advance_refund', amount: 2000, payment_date: '2026-11-10', year: 2026, month: 11 },
  }, owner, id(86), date);
  assert.deepEqual(parseBackup(createBackup('demo', data), 'demo').ledger, data);
});

test('native recovery preserves damaged bytes, rejects a stale preview and leaves data intact on write failure', async () => {
  const key = '@rent-manager/demo-ledger/v1';
  const store = new Map([[key, 'damaged original']]);
  let failArchive = false;
  const load = createNativeLedgerStore({
    getItem: async (k) => store.get(k) ?? null,
    setItem: async (k, value) => {
      if (k !== key && failArchive) throw new Error('Storage full');
      store.set(k, value);
    },
  });
  const replacement = parseBackup(createBackup('demo', seed()), 'demo').ledger;
  const recovery = { original: 'damaged original', replacement };
  await assert.rejects(load('demo'), (e) => e instanceof UnreadableLedgerError && e.original === recovery.original);
  store.set(key, 'changed');
  await assert.rejects(load('demo', undefined, recovery), /changed after the preview/);
  store.set(key, recovery.original);
  failArchive = true;
  await assert.rejects(load('demo', undefined, recovery), /Storage full/);
  assert.equal(store.get(key), recovery.original);
  failArchive = false;
  assert.deepEqual(await load('demo', undefined, recovery), replacement);
  assert.deepEqual(await load('demo'), replacement);
  assert.deepEqual([...store].filter(([k]) => k.startsWith(key + '/recovery/')).map(([,v]) => v), [recovery.original]);
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

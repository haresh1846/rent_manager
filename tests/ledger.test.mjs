import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDemoLedger } from '../src/ledger/demo.ts';
import { applyCommand, calculateMonth, presentLedger, isLeaseCurrent } from '../src/ledger/model.ts';
import { createNativeLedgerStore, webDatabaseName } from '../src/ledger/workspace.ts';

const now = new Date(2026, 10, 16, 12);
const owner = 'local-demo';
const seed = () => createDemoLedger(now);
const cmdId = '00000000-0000-4000-8000-000000000001';

test('personal records start empty and persist separately from existing demo records', async () => {
  // The old app wrote edited demo records to this exact native key.
  const previousDemo = seed();
  previousDemo.properties[0].name = 'Previously edited demo';
  const demoKey = '@rent-manager/demo-ledger/v1';
  const saved = new Map([[demoKey, JSON.stringify(previousDemo)]]);
  const device = {
    getItem: async (key) => saved.get(key) ?? null,
    setItem: async (key, value) => {
      saved.set(key, value);
    },
  };
  const load = createNativeLedgerStore(device);
  assert.equal((await load('personal')).properties.length, 0);
  assert.deepEqual(await load('demo'), previousDemo);
  const add = (id, name) => (current) =>
    applyCommand(current, { kind: 'tenant', input: { name } }, 'local-personal', id, now);
  await Promise.all([
    load('personal', add(cmdId, 'First tenant')),
    load('personal', add('second', 'Second tenant')),
  ]);
  const reopened = createNativeLedgerStore(device);
  const personal = await reopened('personal');
  assert.deepEqual(
    personal.tenants.map((t) => t.name),
    ['Second tenant', 'First tenant']
  );
  assert.ok(personal.tenants.every((t) => t.owner_id === 'local-personal'));
  assert.equal(saved.get(demoKey), JSON.stringify(previousDemo));
  assert.equal(webDatabaseName('demo'), 'rent-manager-demo');
  assert.notEqual(webDatabaseName('personal'), webDatabaseName('demo'));
});
function pay(data, amount, payment_type = 'rent', kind = 'payment') {
  const lease_id = data.leases[0].id;
  return applyCommand(
    data,
    { kind, input: { lease_id, amount, payment_type, year: 2026, month: 11, payment_date: '2026-11-16' } },
    owner,
    cmdId,
    now
  );
}

test('demo rent and occupancy come from dated leases and payments', () => {
  const data = seed();
  const { due, collected, outstanding, occupied, advanceBalance } = calculateMonth(data, 2026, 11);
  assert.deepEqual(
    [due, collected, outstanding, occupied, advanceBalance],
    [42000, 30000, 12000, 2, 42000]
  );
  assert.equal(calculateMonth(data, 2026, 10).due, 0);
  assert.equal(calculateMonth(data, 2026, 12).collected, 0);
  assert.deepEqual(
    presentLedger(data, '2026-10-30').properties.map((p) => p.status),
    ['vacant', 'vacant', 'vacant']
  );
});

test('editing master records preserves contracts, identity, and omitted contact fields', () => {
  const data = seed();
  const original = data.properties.find((p) => p.id === data.leases[0].property_id);
  const saved = applyCommand(
    data,
    {
      kind: 'update_property',
      input: {
        ...original,
        name: 'Updated house',
        address: 'Another street',
        monthly_rent: 25000,
        status: 'maintenance',
        expected_updated_at: original.updated_at,
      },
    },
    owner,
    cmdId,
    new Date(now.getTime() + 100)
  );
  const property = saved.properties.find((p) => p.id === original.id);
  assert.equal(property.monthly_rent, 25000);
  assert.equal(property.status, original.status);
  assert.equal(property.created_at, original.created_at);
  assert.equal(saved.leases[0].monthly_rent, 24000);
  const tenant = saved.tenants[0];
  tenant.emergency_contact_name = 'Preserve this name';
  tenant.phone = '111222';
  const edited = applyCommand(
    saved,
    {
      kind: 'update_tenant',
      input: { id: tenant.id, name: 'Revised tenant', phone: '', expected_updated_at: tenant.updated_at },
    },
    owner,
    cmdId,
    new Date(now.getTime() + 100)
  );
  assert.equal(edited.tenants[0].emergency_contact_name, 'Preserve this name');
  assert.equal(edited.tenants[0].phone, null);
  assert.equal(edited.tenants[0].id, tenant.id);
  assert.throws(
    () =>
      applyCommand(
        edited,
        {
          kind: 'update_tenant',
          input: { id: tenant.id, name: 'Stale', expected_updated_at: tenant.updated_at },
        },
        owner,
        cmdId,
        now
      ),
    /changed/
  );
});
test('cash receipts and explicit advance usage settle rent once, exactly to the cent', () => {
  let data = pay(seed(), 5999.99);
  const start = data.leases[0].advance_balance;
  data = pay(data, 6000.01, 'rent', 'apply_advance');
  const report = calculateMonth(data, 2026, 11);
  assert.equal(report.outstanding, 0);
  assert.equal(report.collected, 42000);
  assert.equal(report.cashCollected, 35999.99);
  assert.equal(report.advanceApplied, 6000.01);
  assert.equal(data.leases[0].advance_balance, (Math.round(start * 100) - 600001) / 100);
  assert.throws(() => pay(data, 0.01), /outstanding/);
});
test('top-ups and deposits stay out of rent collected', () => {
  let data = pay(seed(), 250, 'advance');
  data = pay(data, 100, 'security_deposit');
  assert.equal(data.leases[0].advance_balance, 24250);
  assert.equal(calculateMonth(data, 2026, 11).collected, 30000);
});
test('prevents invalid amounts, over-application, and out-of-term rent', () => {
  const data = seed();
  for (const value of [0, -50, NaN, Infinity, 5.005, 12000.01]) assert.throws(() => pay(data, value));
  data.leases[0].advance_balance = 20;
  assert.throws(() => pay(data, 21, 'rent', 'apply_advance'), /available advance/);
  assert.throws(
    () =>
      applyCommand(
        data,
        {
          kind: 'payment',
          input: {
            lease_id: data.leases[0].id,
            payment_type: 'rent',
            amount: 10,
            year: 2026,
            month: 10,
            payment_date: '2026-11-16',
          },
        },
        owner,
        cmdId,
        now
      ),
    /within the lease/
  );
});
test('overlapping leases and invalid dates fail, move-out keeps historic rent', () => {
  const data = seed();
  const lease = data.leases[0];
  const input = { ...lease, end_date: undefined };
  assert.throws(
    () => applyCommand(data, { kind: 'lease', input }, owner, cmdId, now),
    /already has a lease/
  );
  assert.throws(() =>
    applyCommand(data, { kind: 'lease', input: { ...input, start_date: '2026-02-30' } }, owner, cmdId, now)
  );
  const ended = applyCommand(
    data,
    { kind: 'end_lease', input: { id: lease.id, end_date: '2026-11-15' } },
    owner,
    cmdId,
    now
  );
  assert.equal(isLeaseCurrent(ended.leases[0], '2026-11-16'), false);
  assert.equal(isLeaseCurrent(ended.leases[0], '2026-11-14'), true);
  assert.doesNotThrow(() =>
    applyCommand(ended, { kind: 'lease', input: { ...input, start_date: '2026-11-15' } }, owner, cmdId, now)
  );
  assert.equal(calculateMonth(ended, 2026, 11).due, 42000);
  assert.equal(calculateMonth(ended, 2026, 12).due, 18000);
  assert.equal(
    presentLedger(ended, '2026-11-16').properties.find((p) => p.id === lease.property_id).status,
    'vacant'
  );
});
test('maintenance can be opened, resolved, and reopened for an existing property', () => {
  let data = seed();
  data = applyCommand(
    data,
    { kind: 'maintenance', input: { property_id: data.properties[0].id, title: 'Tap leaking' } },
    owner,
    cmdId,
    now
  );
  for (const status of ['resolved', 'open']) {
    data = applyCommand(
      data,
      { kind: 'maintenance_status', input: { id: cmdId, status } },
      owner,
      cmdId,
      now
    );
    assert.equal(data.maintenance[0].status, status);
  }
});

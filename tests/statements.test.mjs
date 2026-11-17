import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDemoLedger } from '../src/ledger/demo.ts';
import { getArrears, getTenantStatement } from '../src/ledger/statements.ts';

function fixture() {
  const data = createDemoLedger(new Date(2026, 10, 17, 12));
  const tenant = data.tenants.find(t => t.name === 'Arun Rao');
  const lease = data.leases.find(l => l.tenant_id === tenant.id);
  const original = data.payments.find(p => p.tenant_id === tenant.id);
  function record(id, input) {
    data.payments.push({ ...original, id, ...input });
  }
  return { data, tenant, lease, original, record };
}

test('a settled current month keeps older arrears collectible across a year boundary', () => {
  const { data, tenant, record } = fixture();
  record('dec', { amount: 24000, month: 12, payment_date: '2026-12-01' });
  record('jan', { amount: 24000, year: 2027, month: 1, payment_date: '2026-12-28' });
  const statement = getTenantStatement(data, tenant.id, '2027-01-10');
  assert.equal(statement.billed, 72000);
  assert.equal(statement.settled, 60000);
  assert.equal(statement.outstanding, 12000);
  assert.deepEqual(statement.months.map(m => m.period), ['2027-01', '2026-12', '2026-11']);
  const account = getArrears(data, '2027-01-10').find(a => a.tenant.id === tenant.id);
  assert.equal(account.pastDue, 12000);
  assert.equal(account.currentDue, 0);
  assert.equal(account.oldest.period, '2026-11');
  assert.equal(account.oldest.outstanding, 12000);
  assert.deepEqual(account.months, [account.oldest]);
});

test('a statement respects receipt dates and shows payment corrections without double counting', () => {
  const { data, tenant, original, record } = fixture();
  const reversedAt = new Date(2026, 10, 20, 12).toISOString();
  original.reversal = { reason: 'Wrong amount', reversed_at: reversedAt };
  record('replacement', {
    reversal: undefined, replaces_payment_id: original.id, payment_date: '2026-11-17',
    created_at: new Date(2026, 10, 20, 14).toISOString(),
    amount: 11000.25, notes: 'Corrected receipt',
  });
  record('pending', { reversal: undefined, status: 'pending', amount: 100, payment_date: '2026-11-19' });
  record('legacy-future', { reversal: undefined, amount: 200, payment_date: '2026-11-29' });
  const earlier = getTenantStatement(data, tenant.id, '2026-11-18');
  assert.equal(earlier.settled, 12000);
  assert.equal(earlier.receipts.length, 2);
  assert.equal(earlier.receipts[0].status, 'Posted');
  const later = getTenantStatement(data, tenant.id, '2026-11-22');
  assert.equal(later.settled, 11000.25);
  assert.equal(later.outstanding, 12999.75);
  assert.equal(later.receipts.length, 4);
  assert.match(later.receipts.find(r => r.status === 'Reversed').note, /Wrong amount/);
  assert.equal(later.receipts.find(r => r.status === 'Replacement').note, 'Corrected receipt');
});

test('advance, deposit, refunds and deductions stay separate from rent charges', () => {
  const { data, tenant, record } = fixture();
  record('advance', { payment_type: 'advance', amount: 1000 });
  record('credit', { amount: 2500.55, settlement_source: undefined, status: 'advance_used' });
  record('advanceRefund', { payment_type: 'advance_refund', amount: 225.2 });
  record('deposit', { payment_type: 'security_deposit', amount: 3000 });
  record('depositRefund', { payment_type: 'deposit_refund', amount: 500 });
  record('deduction', { payment_type: 'deposit_deduction', amount: 125 });
  const statement = getTenantStatement(data, tenant.id, '2026-11-30');
  assert.equal(statement.advanceBalance, 22274.25);
  assert.equal(statement.depositBalance, 2375);
  assert.equal(statement.months[0].cash, 12000);
  assert.equal(statement.months[0].advanceApplied, 2500.55);
  assert.equal(statement.outstanding, 9499.45);
});

test('terminated leases keep final rent, upcoming leases do not create arrears before move-in', () => {
  const { data, tenant, lease } = fixture();
  lease.end_date = '2026-12-02';
  lease.status = 'terminated';
  data.leases.push({ ...lease, id: 'scheduled', start_date: '2027-01-25',
    end_date: null, status: 'active', advance_paid: 0, advance_balance: 0 });
  const statement = getTenantStatement(data, tenant.id, '2027-01-17');
  assert.deepEqual(statement.months.map(m => m.period), ['2026-12', '2026-11']);
  assert.equal(getArrears(data, '2027-01-17').find(a => a.tenant.id === tenant.id).pastDue, 36000);
});

test('opening advances appear once for historical and scheduled leases and reconcile with the held amount', () => {
  const { data, tenant, lease } = fixture();
  lease.end_date = '2026-11-30';
  const signing = new Date(2026, 11, 6, 12).toISOString();
  data.leases.push({ ...lease, id: 'scheduled', start_date: '2027-01-15', created_at: signing,
    end_date: null, advance_paid: 35.75, advance_balance: 35.75 });
  data.leases.push({ ...lease, id: 'zero', start_date: '2028-01-01', end_date: null,
    advance_paid: 0, advance_balance: 0 });
  const historical = getTenantStatement(data, tenant.id, '2026-11-01');
  assert.deepEqual(historical.receipts.map(r => [r.description, r.date, r.amount]), [
    ['Opening advance', '2026-11-01', 24000],
  ]);
  assert.equal(historical.advanceBalance, 24000);
  const scheduled = getTenantStatement(data, tenant.id, '2026-12-06');
  const entries = scheduled.receipts.filter(r => r.description === 'Opening advance');
  assert.deepEqual(entries.map(r => [r.date, r.amount, r.period]), [
    ['2026-12-06', 35.75, ''], ['2026-11-01', 24000, ''],
  ]);
  assert.equal(entries[0].propertyName, 'Market Road Studio');
  assert.match(entries[0].note, /2027-01-15/);
  assert.equal(scheduled.advanceBalance, 24035.75);
  assert.equal(scheduled.settled, 12000);
});

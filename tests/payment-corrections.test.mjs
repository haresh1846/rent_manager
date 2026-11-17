import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createDemoLedger } from '../src/ledger/demo.ts';
import { applyCommand, billingMonthParam, calculateCashMonth, calculateMonth, fundBalances } from '../src/ledger/model.ts';

const clock = new Date(2026, 10, 17, 12);
const today = '2026-11-17';
const seed = () => createDemoLedger(clock);
const update = (data, cmd) => applyCommand(data, cmd, 'local-demo', randomUUID(), clock);
function record(data, amount, type = 'rent', fields = {}, command = {}) {
  return update(data, {
    kind: 'payment', ...command,
    input: { lease_id: data.leases[0].id, amount, payment_type: type, year: 2026, month: 11, payment_date: today, ...fields },
  });
}
function reverse(data, id, reason = 'Duplicate entry') {
  return update(data, { kind: 'reverse_payment', input: { id, reason } });
}

test('billing months survive navigation as validated parameters, separately from receipt dates', () => {
  assert.equal(billingMonthParam('2026-10'), '2026-10');
  for (const invalid of [undefined, ['2026-10'], '2026-00', '2026-13', '1880-12', '2026-1']) {
    assert.equal(billingMonthParam(invalid), undefined);
  }
  const data = seed();
  assert.throws(() => record(data, 12000, 'rent', { payment_date: '2026-11-18' }), /today or earlier/);
  const prepayment = record(data, 12000, 'rent', { month: 12 });
  assert.equal(calculateMonth(prepayment, 2026, 12, today).cashCollected, 12000);
  const old = structuredClone(data);
  old.payments[0].payment_date = '2026-11-18';
  assert.equal(calculateMonth(old, 2026, 11, today).collected, 18000);
  assert.equal(calculateMonth(old, 2026, 11, '2026-11-18').collected, 30000);
});

test('reversals preserve the receipt, reopen the installment, and link exactly one optional replacement', () => {
  const paid = record(seed(), 12000);
  const original = paid.payments[0];
  assert.throws(() => reverse(paid, original.id, '  '), /reason/);
  assert.throws(() => record(paid, 1, 'other', {}, { replaces: original.id }), /reversed payment/);
  const undone = reverse(paid, original.id, '  Wrong billing month  ');
  assert.equal(calculateMonth(undone, 2026, 11, today).outstanding, 12000);
  assert.deepEqual(undone.payments[0], { ...original, reversal: { reason: 'Wrong billing month', reversed_at: clock.toISOString() } });
  assert.throws(() => reverse(undone, original.id), /not been reversed/);
  const fixed = record(undone, 9000.25, 'rent', { month: 12 }, { replaces: original.id });
  assert.equal(fixed.payments[0].replaces_payment_id, original.id);
  assert.equal(calculateMonth(fixed, 2026, 12, today).collected, 9000.25);
  assert.throws(() => record(fixed, 5, 'other', {}, { replaces: original.id }), /already been recorded/);
});

test('advance withdrawals and reversals cannot overdraw a fund and restore exact paise', () => {
  let data = seed();
  data.leases[0].advance_balance = data.leases[0].advance_paid = 0;
  data = record(data, 300.55, 'advance');
  const topUp = data.payments[0].id;
  data = record(data, 100.50, 'rent', {}, { kind: 'apply_advance' });
  const usage = data.payments[0].id;
  assert.equal(data.leases[0].advance_balance, 200.05);
  data = record(data, 80.02, 'advance_refund');
  const refund = data.payments[0].id;
  assert.equal(data.leases[0].advance_balance, 120.03);
  assert.throws(() => reverse(data, topUp), /overdraw/);
  assert.throws(() => record(data, 120.04, 'advance_refund'), /available advance/);
  data = reverse(reverse(reverse(data, refund), usage), topUp);
  assert.equal(data.leases[0].advance_balance, 0);
  assert.equal(calculateMonth(data, 2026, 11, today).advanceApplied, 0);
});

test('move-out supports late collections, itemized deductions and partial refunds', () => {
  const initial = record(seed(), 1500, 'security_deposit', { payment_date: '2026-11-10' });
  const deposit = initial.payments[0].id, lease = initial.leases[0];
  let data = update(initial, { kind: 'end_lease', input: { id: lease.id, end_date: '2026-11-16' } });
  assert.throws(() => record(data, 1, 'advance'), /lease has ended/);
  assert.throws(() => record(data, 1, 'security_deposit'), /lease has ended/);
  data = record(data, 2500);
  assert.throws(() => record(data, 140, 'deposit_deduction'), /reason/);
  data = record(data, 140, 'deposit_deduction', { notes: 'Replace broken key' });
  data = record(data, 860.25, 'deposit_refund');
  assert.equal(fundBalances(data, data.leases[0], today).deposit, 499.75);
  assert.throws(() => record(data, 500, 'deposit_refund'), /held security deposit/);
  assert.throws(() => reverse(data, deposit), /overdraw/);
  assert.equal(calculateMonth(data, 2026, 11, today).cashCollected, 32500);
  assert.equal(fundBalances(reverse(data, data.payments[0].id), data.leases[0], today).deposit, 1360);
});

test('backdating a withdrawal guards the intervening balance even if today can cover it', () => {
  let data = record(seed(), 500, 'security_deposit', { payment_date: '2026-11-02' });
  data = record(data, 500, 'deposit_refund', { payment_date: '2026-11-10' });
  data = record(data, 500, 'security_deposit', { payment_date: '2026-11-15' });
  assert.throws(() => record(data, 10, 'deposit_refund', { payment_date: '2026-11-03' }), /held security deposit/);
});

test('legacy future-dated funds cannot finance a withdrawal today', () => {
  let data = record(seed(), 500, 'advance');
  data.payments[0].payment_date = '2026-11-27';
  assert.equal(fundBalances(data, data.leases[0], today).advance, 24000);
  assert.throws(() => record(data, 24300, 'advance_refund'), /available advance/);
});

test('receipt-date reporting separates actual cash, refunds and net from the rent billing month', () => {
  let data = seed();
  const december = new Date(2026, 11, 5, 12);
  const at = '2026-12-05';
  const post = (payment_type, amount, kind = 'payment') => {
    data = applyCommand(data, { kind, input: { lease_id: data.leases[0].id,
      month: 11, year: 2026, payment_date: at, payment_type, amount, notes: 'Checkout' } }, 'local-demo', randomUUID(), december);
  };
  for (const [type, amount] of [['rent', 2000], ['advance', 500], ['security_deposit', 900],
    ['maintenance', 45], ['other', 25], ['advance_refund', 99.95], ['deposit_refund', 100.05],
    ['deposit_deduction', 15]]) post(type, amount);
  post('rent', 50, 'apply_advance');
  post('other', 7);
  data = applyCommand(data, { kind: 'reverse_payment', input: { id: data.payments[0].id, reason: 'Duplicate' } }, 'local-demo', randomUUID(), december);
  const template = data.payments.find(p => p.payment_type === 'maintenance');
  data.payments.push({ ...template, id: randomUUID(), status: 'pending' },
    { ...template, id: randomUUID(), payment_date: '2026-12-06' });
  const cash = calculateCashMonth(data, '2026-12', at);
  assert.equal(cash.received, 3470);
  assert.equal(cash.refunded, 200);
  assert.equal(cash.net, 3270);
  assert.equal(cash.receipts.length, 7);
  assert.equal(calculateCashMonth(data, '2026-11', at).received, 30000);
  assert.equal(calculateMonth(data, 2026, 11, at).cashCollected, 32000);
});

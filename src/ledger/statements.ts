import type { Lease, Payment, Tenant } from '../types/index';
import { advanceMovement, depositMovement, isPostedPayment, localDate, usesAdvance, type Ledger } from './model.ts';

export interface StatementMonth {
  leaseId: string;
  propertyName: string;
  period: string;
  rent: number;
  cash: number;
  advanceApplied: number;
  outstanding: number;
}

export interface StatementReceipt {
  id: string;
  date: string;
  period: string;
  propertyName: string;
  description: string;
  amount: number;
  status: string;
  note: string;
}

export interface TenantStatement {
  tenant: Tenant;
  asOf: string;
  billed: number;
  settled: number;
  outstanding: number;
  advanceBalance: number;
  depositBalance: number;
  months: StatementMonth[];
  receipts: StatementReceipt[];
}

export type ArrearsRow = StatementMonth & { tenantId: string; tenantName: string };

export interface ArrearsAccount {
  tenant: Tenant;
  oldest: StatementMonth;
  months: StatementMonth[];
  pastDue: number;
  currentDue: number;
  outstanding: number;
}

const paise = (amount: number) => Math.round(amount * 100);

function periodOf(payment: Payment) {
  return payment.year + '-' + String(payment.month).padStart(2, '0');
}

function reversalDate(payment: Payment) {
  return payment.reversal && localDate(new Date(payment.reversal.reversed_at));
}

function recordedBy(payment: Payment, asOf: string) {
  // A backdated correction takes effect when it is issued. Its original may still be posted earlier.
  return payment.payment_date <= asOf &&
    (!payment.replaces_payment_id || localDate(new Date(payment.created_at)) <= asOf);
}

function postedBy(payment: Payment, asOf: string) {
  if (!recordedBy(payment, asOf) || payment.status === 'pending') return false;
  return isPostedPayment(payment) || (reversalDate(payment) ?? '') > asOf;
}

function monthNumber(period: string) {
  return Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1;
}

function billedMonths(
  leases: Lease[], payments: Payment[], properties: Map<string, string>, asOf: string
): StatementMonth[] {
  const paid = new Map<string, { cash: number; advance: number }>();
  for (const payment of payments) {
    if (payment.payment_type !== 'rent' || !postedBy(payment, asOf)) continue;
    const key = payment.lease_id + '/' + periodOf(payment);
    const amounts = paid.get(key) ?? { cash: 0, advance: 0 };
    amounts[usesAdvance(payment) ? 'advance' : 'cash'] += paise(payment.amount);
    paid.set(key, amounts);
  }

  const months: StatementMonth[] = [];
  const through = monthNumber(asOf);
  for (const lease of leases) {
    if (lease.start_date > asOf || (lease.status === 'terminated' && !lease.end_date)) continue;
    const last = lease.end_date ? Math.min(through, monthNumber(lease.end_date)) : through;
    const propertyName = properties.get(lease.property_id) ?? 'Property';
    const rent = paise(lease.monthly_rent);
    for (let n = monthNumber(lease.start_date); n <= last; n++) {
      const period = String(Math.floor(n / 12)).padStart(4, '0') + '-' + String(n % 12 + 1).padStart(2, '0');
      const amounts = paid.get(lease.id + '/' + period);
      const cash = amounts?.cash ?? 0;
      const advance = amounts?.advance ?? 0;
      months.push({ leaseId: lease.id, propertyName, period, rent: rent / 100,
        cash: cash / 100, advanceApplied: advance / 100, outstanding: Math.max(0, rent - cash - advance) / 100 });
    }
  }
  return months;
}

export function getArrears(data: Ledger, asOf = localDate()): ArrearsAccount[] {
  const tenants = new Map(data.tenants.map((t) => [t.id, t]));
  const properties = new Map(data.properties.map((p) => [p.id, p.name]));
  const leases = new Map(data.leases.map((l) => [l.id, l.tenant_id]));
  const accounts = new Map<string, ArrearsAccount>();
  const period = asOf.slice(0, 7);
  for (const month of billedMonths(data.leases, data.payments, properties, asOf)) {
    if (month.outstanding === 0) continue;
    const tenant = tenants.get(leases.get(month.leaseId) ?? '');
    if (!tenant) continue;
    const account = accounts.get(tenant.id) ?? {
      tenant, oldest: month, months: [], pastDue: 0, currentDue: 0, outstanding: 0,
    };
    account.months.push(month);
    if (month.period < account.oldest.period) account.oldest = month;
    const field = month.period < period ? 'pastDue' : 'currentDue';
    account[field] = (paise(account[field]) + paise(month.outstanding)) / 100;
    account.outstanding = (paise(account.pastDue) + paise(account.currentDue)) / 100;
    accounts.set(tenant.id, account);
  }
  return Array.from(accounts.values()).sort((a, b) =>
    a.oldest.period.localeCompare(b.oldest.period) || b.outstanding - a.outstanding ||
    a.tenant.name.localeCompare(b.tenant.name)
  );
}

const paymentDescriptions = {
  rent: 'Rent payment', advance: 'Advance received', security_deposit: 'Security deposit',
  maintenance: 'Maintenance payment', other: 'Other payment',
  advance_refund: 'Advance refunded', deposit_refund: 'Security deposit refunded',
  deposit_deduction: 'Security deposit deduction',
} as const;

export function getTenantStatement(data: Ledger, tenantId: string, asOf = localDate()): TenantStatement | undefined {
  const tenant = data.tenants.find((t) => t.id === tenantId);
  if (!tenant) return undefined;
  const properties = new Map(data.properties.map((p) => [p.id, p.name]));
  const leases = data.leases.filter((l) => l.tenant_id === tenantId);
  const payments = data.payments.filter((p) => p.tenant_id === tenantId && recordedBy(p, asOf));
  const months = billedMonths(leases, payments, properties, asOf).sort((a, b) =>
    b.period.localeCompare(a.period) || a.propertyName.localeCompare(b.propertyName)
  );
  let billed = 0, settled = 0, outstanding = 0;
  for (const month of months) {
    billed += paise(month.rent);
    settled += paise(month.cash) + paise(month.advanceApplied);
    outstanding += paise(month.outstanding);
  }
  let advance = 0;
  let deposit = 0;
  const receipts = payments
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at))
    .map((payment): StatementReceipt => {
      const applied = usesAdvance(payment);
      if (postedBy(payment, asOf)) {
        advance += paise(advanceMovement(payment));
        deposit += paise(depositMovement(payment));
      }
      const reversedOn = reversalDate(payment);
      const reversed = reversedOn && reversedOn <= asOf;
      const note = [payment.notes, reversed && payment.reversal && ('Reversed ' + reversedOn + ' · ' + payment.reversal.reason)]
        .filter(Boolean).join(' · ');
      return {
        id: payment.id, date: payment.payment_date, period: periodOf(payment),
        propertyName: properties.get(payment.property_id) ?? 'Property',
        description: applied ? 'Advance applied to rent' : paymentDescriptions[payment.payment_type],
        amount: payment.amount,
        status: reversed ? 'Reversed' : payment.status === 'pending' ? 'Pending' : payment.replaces_payment_id ? 'Replacement' : 'Posted',
        note,
      };
    });
  for (const lease of leases) {
    if (!lease.advance_paid) continue;
    // An advance brought into a historical lease starts at move-in. A scheduled lease can hold funds at signing.
    const enteredOn = localDate(new Date(lease.created_at));
    const date = lease.start_date < enteredOn ? lease.start_date : enteredOn;
    if (date > asOf) continue;
    advance += paise(lease.advance_paid);
    receipts.push({
      id: 'opening-' + lease.id,
      date,
      period: '',
      propertyName: properties.get(lease.property_id) ?? 'Property',
      description: 'Opening advance',
      amount: lease.advance_paid,
      status: 'Opening balance',
      note: 'Starting advance held for the lease beginning ' + lease.start_date + '.',
    });
  }
  receipts.sort((a, b) => b.date.localeCompare(a.date));
  return { tenant, asOf, billed: billed / 100, settled: settled / 100,
    outstanding: outstanding / 100, advanceBalance: advance / 100, depositBalance: deposit / 100, months, receipts };
}

import type { ArrearsRow, TenantStatement } from '../ledger/statements';

export type CellKind = 'text' | 'money' | 'number' | 'date' | 'month';
export interface ReportColumn { label: string; width: number; kind: CellKind }
export interface ReportSection {
  title: string;
  columns: ReportColumn[];
  rows: (number | string)[][];
  empty: string;
}
export interface FinancialReport {
  title: string;
  subject: string;
  asOf: string;
  figures: { label: string; value: number; kind: 'money' | 'number' }[];
  sections: ReportSection[];
}

const billingColumns: ReportColumn[] = [
  { label: 'Month', width: 16, kind: 'month' },
  { label: 'Property', width: 31, kind: 'text' },
  { label: 'Rent billed', width: 17, kind: 'money' },
  { label: 'Cash settled', width: 17, kind: 'money' },
  { label: 'Advance used', width: 17, kind: 'money' },
  { label: 'Outstanding', width: 18, kind: 'money' },
];

export function tenantReport(s: TenantStatement): FinancialReport {
  return {
    title: 'Tenant statement', subject: s.tenant.name, asOf: s.asOf,
    figures: [
      { label: 'Rent outstanding', value: s.outstanding, kind: 'money' },
      { label: 'Total rent billed', value: s.billed, kind: 'money' },
      { label: 'Rent settled', value: s.settled, kind: 'money' },
      { label: 'Available advance', value: s.advanceBalance, kind: 'money' },
      { label: 'Deposit held', value: s.depositBalance, kind: 'money' },
    ],
    sections: [
      { title: 'Rent by month', columns: billingColumns, empty: 'No rent billed through this date.',
        rows: s.months.map(r => [r.period, r.propertyName, r.rent, r.cash, r.advanceApplied, r.outstanding]) },
      { title: 'Transactions', empty: 'No transactions through this date.',
        columns: [
          { label: 'Date', width: 16, kind: 'date' }, { label: 'Bill month', width: 14, kind: 'month' },
          { label: 'Property', width: 26, kind: 'text' }, { label: 'Transaction', width: 22, kind: 'text' },
          { label: 'Amount', width: 17, kind: 'money' }, { label: 'Status', width: 18, kind: 'text' },
          { label: 'Note', width: 38, kind: 'text' },
        ],
        rows: s.receipts.map(r => [r.date, r.period, r.propertyName, r.description, r.amount, r.status, r.note]) },
    ],
  };
}

export function arrearsReport(rows: ArrearsRow[], asOf: string): FinancialReport {
  return {
    title: 'Arrears report', subject: 'Portfolio', asOf,
    figures: [
      { label: 'Rent outstanding', value: rows.reduce((a, r) => a + Math.round(r.outstanding * 100), 0) / 100, kind: 'money' },
      { label: 'Tenants with a balance', value: new Set(rows.map(r => r.tenantId)).size, kind: 'number' },
      { label: 'Unpaid installments', value: rows.length, kind: 'number' },
    ],
    sections: [{ title: 'Unpaid months', empty: 'All rent billed through this date is settled.',
      columns: [{ label: 'Tenant', width: 26, kind: 'text' }, ...billingColumns],
      rows: rows.map(r => [r.tenantName, r.period, r.propertyName, r.rent, r.cash, r.advanceApplied, r.outstanding]) }],
  };
}

export function fileBase(report: FinancialReport) {
  const clean = report.subject.normalize('NFC').replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[^\p{L}\p{M}\p{N}() ._-]/gu, '').trim();
  const subject = Array.from(clean).slice(0, 65).join('');
  return ['Rentfold', report.title, subject || 'Report', report.asOf].join(' - ');
}

export function displayCell(value: number | string, kind: CellKind) {
  if (kind === 'money') return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (kind === 'month' || kind === 'date') {
    const date = new Date(String(value) + (kind === 'month' ? '-01' : '') + 'T12:00:00Z');
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', {
      timeZone: 'UTC', day: kind === 'date' ? 'numeric' : undefined, month: 'short', year: 'numeric',
    });
  }
  return String(value);
}

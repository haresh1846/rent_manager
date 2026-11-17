import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import { arrearsReport, fileBase, tenantReport } from '../src/services/financialReport.ts';
import { reportHtml } from '../src/services/reportPrint.ts';
import { reportWorkbook } from '../src/services/reportWorkbook.ts';

const month = {
  leaseId: 'lease', propertyName: 'A & B', period: '2024-02',
  rent: 1200.75, cash: 1000.25, advanceApplied: 100.15, outstanding: 100.35,
};
const note = '=1+2 <A&B> "paid"\nकिराया';
const statement = {
  tenant: { name: 'मीरा शाह' }, asOf: '2024-02-29', billed: month.rent, settled: 1100.4,
  outstanding: month.outstanding, advanceBalance: 899.85, depositBalance: 7000, months: [month],
  receipts: [{ id: 'receipt', date: '2024-02-29', period: month.period, propertyName: month.propertyName,
    description: 'Rent payment', amount: month.cash, status: 'Posted', note }],
};

function sheet(files, n) {
  return strFromU8(files['xl/worksheets/sheet' + n + '.xml']);
}

test('a tenant export preserves amounts, literal notes and sortable billing and receipt dates', () => {
  const report = tenantReport(statement);
  const files = unzipSync(reportWorkbook(report));
  const overview = sheet(files, 1), months = sheet(files, 2), receipts = sheet(files, 3);
  assert.match(overview, /r="B6"[^>]*><v>100\.35<\/v>/);
  assert.match(months, /r="A6"[^>]*><v>45323<\/v>/);
  assert.match(receipts, /r="A6"[^>]*><v>45351<\/v>/);
  assert.match(receipts, /r="E6"[^>]*><v>1000\.25<\/v>/);
  const escaped = '=1+2 &lt;A&amp;B&gt; &quot;paid&quot;\nकिराया';
  assert.ok(receipts.includes('t="inlineStr"><is><t xml:space="preserve">' + escaped + '</t>'));
  assert.doesNotMatch(receipts, /<f[ >]/);
  const html = reportHtml(report);
  assert.ok(html.includes(escaped));
  assert.ok(html.includes('₹1,200.75'));
  assert.ok(html.includes(statement.tenant.name));
  assert.doesNotMatch(html, /<A&B>/);
});

test('an empty arrears report has zero figures and a readable empty state in both exports', () => {
  const report = arrearsReport([], '2024-02-29');
  assert.deepEqual(report.figures.map((f) => f.value), [0, 0, 0]);
  assert.ok(reportHtml(report).includes(report.sections[0].empty));
  const details = sheet(unzipSync(reportWorkbook(report)), 2);
  assert.ok(details.includes(report.sections[0].empty));
  assert.doesNotMatch(details, /autoFilter/);
});

test('Excel dates account for its 1900 leap-year convention and keep earlier dates readable', () => {
  const days = ['1899-12-12', '1900-01-01', '1900-02-28', '1900-03-01'];
  const report = tenantReport({
    ...statement,
    receipts: days.map((date) => ({ ...statement.receipts[0], date, period: date.slice(0, 7) })),
  });
  const receipts = sheet(unzipSync(reportWorkbook(report)), 3);
  assert.match(receipts, /r="A6"[^>]*t="inlineStr"[^>]*>.*?1899-12-12/);
  assert.match(receipts, /r="A7"[^>]*><v>1<\/v>/);
  assert.match(receipts, /r="A8"[^>]*><v>59<\/v>/);
  assert.match(receipts, /r="A9"[^>]*><v>61<\/v>/);
});

test('larger arrears exports include the last installment, reconcile paise and count distinct tenants', () => {
  const rows = Array.from({length: 220}, (_, i) => ({
    ...month, tenantId: String(i % 7), tenantName: 'Tenant ' + (i % 7),
    propertyName: 'Property ' + i, outstanding: i % 2 ? 0.1 : 0.2,
  }));
  const report = arrearsReport(rows, '2024-02-29');
  assert.deepEqual(report.figures.map((f) => f.value), [33, 7, 220]);
  assert.equal(report.sections[0].rows.length, 220);
  const details = sheet(unzipSync(reportWorkbook(report)), 2);
  assert.match(details, /autoFilter ref="A5:G225"/);
  assert.match(details, /r="G225"[^>]*><v>0\.1<\/v>/);
  assert.ok(reportHtml(report).includes('Property 219'));
});

test('export filenames preserve names in Indian scripts and remove filename separators', () => {
  const filename = fileBase(tenantReport({ ...statement, tenant: { name: 'मीरा शाह / வீடு' } }));
  assert.ok(filename.includes('मीरा शाह'));
  assert.ok(filename.includes('வீடு'));
  assert.doesNotMatch(filename, /[/\\]/);
});

test('an exceptionally long note survives Excel cell limits without duplicating its receipt', () => {
  // A naïve slice at Excel's 32,767-character limit would split the house emoji in half.
  const note = 'z'.repeat(32766) + '🏠' + 'अ'.repeat(2232);
  const report = tenantReport({ ...statement, receipts: [{ ...statement.receipts[0], note }] });
  const files = unzipSync(reportWorkbook(report));
  assert.match(strFromU8(files['xl/workbook.xml']), /name="Extended text"/);
  const receipts = sheet(files, 3);
  assert.ok(receipts.includes('Extended text'));
  assert.equal((receipts.match(/<v>1000\.25<\/v>/g) ?? []).length, 1);
  const extended = sheet(files, 4);
  assert.doesNotMatch(extended, /<v>1000\.25<\/v>/);
  const chunks = [...extended.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
    .map((match) => match[1]).filter((value) => /^[zअ🏠]+$/u.test(value));
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length <= 32767));
  assert.equal(chunks.join(''), note);
});

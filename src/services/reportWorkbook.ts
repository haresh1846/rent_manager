import { strToU8, zipSync } from 'fflate';
import type { CellKind, FinancialReport, ReportColumn, ReportSection } from './financialReport';

const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const sheetNS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageNS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const sheetType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.';
const day = 86400000;

function xml(value: string) {
  return value.replace(/[\p{Cc}\p{Cs}\uFFFE\uFFFF]/gu, c => '\n\t\r'.includes(c) ? c : '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function cell(ref: string, value: string | number, style: number) {
  return typeof value === 'number'
    ? `<c r="${ref}" s="${style}"><v>${value}</v></c>`
    : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}
function dataCell(ref: string, value: string | number, kind: CellKind) {
  if (kind === 'month' || kind === 'date') {
    const timestamp = Date.parse(value + (kind === 'month' ? '-01' : '') + 'T00:00:00Z');
    if (timestamp >= Date.UTC(1900, 0, 1)) {
      // Excel reserves serial 60 for the fictitious 29 Feb 1900.
      const offset = timestamp < Date.UTC(1900, 2, 1) ? 25568 : 25569;
      return cell(ref, timestamp / day + offset, kind === 'month' ? 8 : 7);
    }
  }
  return cell(ref, value, kind === 'money' ? 6 : kind === 'number' ? 9 : 5);
}
const col = (i: number) => String.fromCharCode(65 + i); // Report tables have at most seven columns.
const row = (n: number, height: number, cells: string) => `<row r="${n}" ht="${height}" customHeight="1">${cells}</row>`;

function worksheet(report: FinancialReport, section?: ReportSection) {
  const columns: ReportColumn[] = section?.columns ?? [
    { label: 'Balance summary', width: 36, kind: 'text' }, { label: 'Value', width: 28, kind: 'number' },
  ];
  const last = col(columns.length - 1);
  const rows = [
    row(1, 24, cell('A1', 'RENTFOLD', 1)),
    row(2, 40, cell('A2', section?.title ?? report.title, 2)),
    row(3, 30, cell('A3', report.subject + '  /  ' + report.asOf + '  /  INR', 3)),
    row(4, 9, ''),
    row(5, 26, columns.map((c, i) => cell(col(i) + '5', c.label, 4)).join('')),
  ];
  if (section) {
    section.rows.forEach((values, index) => {
      const n = index + 6;
      const lines = Math.max(...values.map((v, i) => String(v).split(/\r?\n/).reduce(
        (total, line) => total + Math.max(1, Math.ceil(line.length / Math.max(8, columns[i].width - 3))), 0)));
      rows.push(row(n, Math.min(409, Math.max(25, 16 * lines + 6)),
        values.map((v, i) => dataCell(col(i) + n, v, columns[i].kind)).join('')));
    });
    if (!section.rows.length) rows.push(row(6, 26, cell('A6', section.empty, 5)));
  } else {
    report.figures.forEach((f, i) => rows.push(row(i + 6, 28,
      cell('A' + (i + 6), f.label, 5) + dataCell('B' + (i + 6), f.value, f.kind))));
  }
  const merges = [1, 2, 3, ...(section && !section.rows.length ? [6] : [])];
  const filter = section?.rows.length ? `<autoFilter ref="A5:${last}${rows.length}"/>` : '';
  return `<worksheet xmlns="${sheetNS}"><sheetViews><sheetView showGridLines="0" workbookViewId="0">
    <pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
    <cols>${columns.map((c, i) => `<col min="${i+1}" max="${i+1}" width="${c.width}" customWidth="1"/>`).join('')}</cols>
    <sheetData>${rows.join('')}</sheetData>${filter}<mergeCells count="${merges.length}">${merges.map(n => `<mergeCell ref="A${n}:${last}${n}"/>`).join('')}</mergeCells>
    <pageMargins left="0.4" right="0.4" top="0.55" bottom="0.55" header="0.2" footer="0.2"/></worksheet>`;
}
const font = (size: number, color: string, bold = false) =>
  `<font>${bold ? '<b/>' : ''}<sz val="${size}"/><color rgb="FF${color}"/><name val="Calibri"/></font>`;
const fill = (color: string) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`;
const xf = (f: number, bg: number, fmt = 0, wrap = false) =>
  `<xf fontId="${f}" fillId="${bg}" numFmtId="${fmt}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" indent="1" horizontal="${fmt ? 'right' : 'left'}" wrapText="${wrap ? 1 : 0}"/></xf>`;
const styles = `<styleSheet xmlns="${sheetNS}">
  <numFmts count="3"><numFmt numFmtId="164" formatCode="&quot;₹&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="dd mmm yyyy"/><numFmt numFmtId="166" formatCode="mmm yyyy"/></numFmts>
  <fonts count="5">${font(11,'203D33')}${font(10,'C6E6A4',true)}${font(22,'FFFFFF',true)}${font(11,'3A5D4E')}${font(11,'254A3B',true)}</fonts>
  <fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fill('173C34')}${fill('EEF4EA')}${fill('DCEBD8')}</fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="10">${[xf(0,0),xf(1,2),xf(2,2),xf(3,3),xf(4,4),xf(0,0,0,true),xf(0,0,164),xf(0,0,165),xf(0,0,166),xf(0,0,1)].join('')}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function workbookSections(report: FinancialReport): ReportSection[] {
  const extra: ReportSection = {
    title: 'Extended text', empty: '',
    columns: [
      { label: 'Reference', width: 15, kind: 'text' }, { label: 'Sheet', width: 22, kind: 'text' },
      { label: 'Original row', width: 15, kind: 'number' }, { label: 'Field', width: 18, kind: 'text' },
      { label: 'Part', width: 10, kind: 'number' }, { label: 'Text', width: 84, kind: 'text' },
    ],
    rows: [],
  };
  let count = 0;
  const sections = report.sections.map(section => ({
    ...section,
    rows: section.rows.map((row, i) => row.map((value, j) => {
      if (typeof value !== 'string' || value.length <= 32767) return value;
      const reference = 'T' + ++count;
      const parts = value.match(/[\s\S]{1,1000}/gu) ?? [];
      parts.forEach((part, k) => extra.rows.push([reference, section.title, i + 6, section.columns[j].label, k + 1, part]));
      return 'See Extended text · ' + reference;
    })),
  }));
  return extra.rows.length ? [...sections, extra] : sections;
}

// Use numeric cells for rupees and dates, and literal strings for every user-entered value.
export function reportWorkbook(report: FinancialReport): Uint8Array<ArrayBuffer> {
  const files: Record<string, Uint8Array> = {};
  const put = (path: string, content: string) => { files[path] = strToU8(declaration + content); };
  const sections = workbookSections(report);
  const titles = ['Overview', ...sections.map(s => s.title)];
  const links = titles.map((_, i) => `<Relationship Id="s${i}" Type="${relNS}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`);
  const sheets = titles.map((title, i) => `<sheet name="${xml(title)}" sheetId="${i+1}" r:id="s${i}"/>`);
  put('_rels/.rels', `<Relationships xmlns="${packageNS}"><Relationship Id="book" Type="${relNS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  put('xl/workbook.xml', `<workbook xmlns="${sheetNS}" xmlns:r="${relNS}"><sheets>${sheets.join('')}</sheets></workbook>`);
  put('xl/_rels/workbook.xml.rels', `<Relationships xmlns="${packageNS}">${links.join('')}<Relationship Id="styles" Type="${relNS}/styles" Target="styles.xml"/></Relationships>`);
  put('xl/styles.xml', styles);
  put('xl/worksheets/sheet1.xml', worksheet(report));
  sections.forEach((s, i) => put(`xl/worksheets/sheet${i+2}.xml`, worksheet(report, s)));
  put('[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${sheetType}sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="${sheetType}styles+xml"/>${titles.map((_,i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="${sheetType}worksheet+xml"/>`).join('')}</Types>`);
  return new Uint8Array(zipSync(files, {level: 5}));
}

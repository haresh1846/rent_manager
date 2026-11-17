import { brandMarkSvg } from '../branding.ts';
import { displayCell, fileBase, type FinancialReport } from './financialReport.ts';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function reportHtml(report: FinancialReport) {
  const figures = report.figures.map((f, i) => `<div class="figure ${i === 0 ? 'main' : ''}"><span>${escape(f.label)}</span><strong>${escape(displayCell(f.value, f.kind))}</strong></div>`);
  const sections = report.sections.map(s => {
    const totalWidth = s.columns.reduce((sum, c) => sum + c.width, 0);
    const cols = s.columns.map(c => `<col style="width:${(100 * c.width / totalWidth).toFixed(2)}%">`);
    const heads = s.columns.map(c => `<th scope="col" class="${c.kind}">${escape(c.label)}</th>`);
    const rows = s.rows.map(row => `<tr>${row.map((v, i) => `<td class="${s.columns[i].kind}">${escape(displayCell(v, s.columns[i].kind))}</td>`).join('')}</tr>`);
    return `<section><h2>${escape(s.title)}</h2>${s.rows.length
      ? `<table><colgroup>${cols.join('')}</colgroup><thead><tr>${heads.join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`
      : `<p class="empty">${escape(s.empty)}</p>`}</section>`;
  });
  return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(fileBase(report))}</title><style>
    *{box-sizing:border-box}body{margin:0;color:#1b382e;background:white;font:11pt/1.4 'Segoe UI','Nirmala UI',Arial,sans-serif}
    main{max-width:980px;margin:auto}header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:2px solid #264d3a}
    .brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16pt;letter-spacing:-.8px}.brand svg{width:31px;height:31px}
    .date{color:#42594d;text-align:right;font-size:9pt}.date strong{display:block;color:#173c34;font-size:11pt}
    h1{margin:18px 0 0;font:normal 33pt/1.12 Georgia,serif;letter-spacing:-1.5px}h1,.subject,td{overflow-wrap:anywhere}
    .subject{font-size:14pt;color:#52675d;margin:5px 0 16px}
    .figures{display:grid;grid-template-columns:repeat(${Math.min(3,report.figures.length)},minmax(0,1fr));gap:6px}
    .figure{padding:9px 12px;background:#edf3e9;border:1px solid #d9e4d6;border-radius:6px;break-inside:avoid}
    .figure span,.figure strong{display:block}.figure span{font-size:8pt;font-weight:600}.figure strong{font-size:16pt;font-variant-numeric:tabular-nums}
    .figure.main{background:#173c34;color:#fff;border-color:#173c34}.figure.main span{color:#c6e6a4}
    h2{margin:21px 0 7px;font:600 14pt/1.25 'Segoe UI',sans-serif;break-after:avoid}
    table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5pt}thead{display:table-header-group}
    th{background:#deebd9;color:#254c37;text-align:left}th,td{padding:7px 5px;vertical-align:top}
    td{border-bottom:1px solid #dce5de;white-space:pre-wrap}tbody tr:nth-child(even){background:#f7f9f5}tr{break-inside:avoid}
    .money,.number{text-align:right;font-variant-numeric:tabular-nums}.empty{font-size:10pt;color:#536a5d}
    @media screen{body{background:#e9eee8;padding:22px 12px}main{background:white;padding:32px clamp(15px,4vw,48px);box-shadow:0 1px 8px #173c341c}.printbar{max-width:980px;margin:0 auto 12px;text-align:right}.printbar button{background:#173c34;color:white;border:0;border-radius:7px;padding:11px 18px;cursor:pointer;font:600 14px 'Segoe UI',sans-serif}}
    @page{size:A4 portrait;margin:15mm 13mm 17mm;@bottom-left{content:"Rentfold";font:9pt sans-serif;color:#52675d}@bottom-right{content:counter(page) " / " counter(pages);font:9pt sans-serif;color:#52675d}}
    @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.printbar{display:none}}
    </style></head><body><main><header><div class="brand">${brandMarkSvg}<span>Rentfold</span></div><div class="date">As of<strong>${escape(displayCell(report.asOf,'date'))}</strong></div></header>
    <h1>${escape(report.title)}</h1><p class="subject">${escape(report.subject)}</p><div class="figures">${figures.join('')}</div>${sections.join('')}</main></body></html>`;
}

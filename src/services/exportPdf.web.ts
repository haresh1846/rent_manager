import type { FinancialReport } from './financialReport';
import { reportHtml } from './reportPrint';

export async function exportPdf(report: FinancialReport) {
  const preview = window.open('', '_blank');
  if (!preview) throw new Error('Allow the report window to open, then try PDF again.');
  try {
    preview.opener = null;
    const doc = preview.document;
    doc.open();
    doc.write(reportHtml(report));
    doc.close();
    const toolbar = doc.createElement('div');
    toolbar.className = 'printbar';
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = 'Print / Save as PDF';
    button.onclick = () => preview.print();
    toolbar.append(button);
    doc.body.prepend(toolbar);
    preview.focus();
    return 'Print preview opened. Choose Print / Save as PDF to save a local copy.';
  } catch (error) {
    preview.close();
    throw error;
  }
}

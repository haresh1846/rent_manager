import { printToFileAsync } from 'expo-print';
import { File } from 'expo-file-system';
import { fileBase, type FinancialReport } from './financialReport';
import { reportHtml } from './reportPrint';
import { saveLocalFile } from './backupFile';

export async function exportPdf(report: FinancialReport) {
  const { uri } = await printToFileAsync({ html: reportHtml(report), width: 595, height: 842 });
  const temporary = new File(uri);
  try {
    await saveLocalFile(await temporary.bytes(), fileBase(report) + '.pdf', 'application/pdf');
  } finally {
    temporary.delete();
  }
  return 'PDF saved.';
}

import { useRef, useState } from 'react';
import { View } from 'react-native';
import type { ArrearsRow, TenantStatement } from '@/ledger/statements';
import { arrearsReport, fileBase, tenantReport, type FinancialReport } from '@/services/financialReport';
import { exportPdf } from '@/services/exportPdf';
import { saveLocalFile } from '@/services/backupFile';
import { Action, Notice, styles } from './ui';

function ExportButtons({ build }: {build: () => FinancialReport}) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error: boolean } | null>(null);
  async function run(format: 'xlsx' | 'pdf') {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setResult(null);
    try {
      const report = build();
      let text: string;
      if (format === 'pdf') {
        text = await exportPdf(report);
      } else {
        const { reportWorkbook } = await import('@/services/reportWorkbook');
        await saveLocalFile(reportWorkbook(report), fileBase(report) + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        text = 'Excel workbook prepared for saving.';
      }
      setResult({ text, error: false });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setResult({ text: error instanceof Error ? error.message : 'Could not export this report.', error: true });
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return <View style={{gap: 8}}>
    <View style={styles.wrap}>
      <Action label="Export Excel" icon="grid" variant="secondary" disabled={busy} onPress={() => void run('xlsx')} />
      <Action label="Export PDF" icon="printer" variant="secondary" disabled={busy} onPress={() => void run('pdf')} />
    </View>
    {result && <Notice tone={result.error ? 'error' : 'success'}>{result.text}</Notice>}
  </View>;
}
export function StatementExports({ statement }: { statement: TenantStatement }) {
  return <ExportButtons build={() => tenantReport(statement)} />;
}
export function ArrearsExports({rows, asOf}: {rows: ArrearsRow[]; asOf: string}) {
  return <ExportButtons build={() => arrearsReport(rows, asOf)} />;
}

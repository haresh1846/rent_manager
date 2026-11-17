import { createDemoLedger } from './demo.ts';
import { emptyLedger, type Ledger } from './model.ts';
import type { LocalWorkspace } from '../providers';

export type EditLedger = (current: Ledger) => Ledger;

export class UnreadableLedgerError extends Error {
  readonly original: string;

  constructor(original: string) {
    super('The saved workspace could not be read. Open Settings to recover it from a backup.');
    this.original = original;
  }
}

export interface Recovery {
  original: string;
  replacement: Ledger;
}

export const staleRecovery = 'The workspace changed after the preview. Choose the backup again to review it.';

export function checkStoredLedger(value: unknown, raw?: string): asserts value is Ledger {
  const names = ['properties', 'tenants', 'leases', 'payments', 'maintenance'];
  if (typeof value === 'object' && value !== null &&
      names.every((key) => Array.isArray((value as Record<string, unknown>)[key]))) {
    return;
  }
  throw new UnreadableLedgerError(raw ?? JSON.stringify(value));
}

// The demo's original database name and native key are part of its storage format.
export function webDatabaseName(workspace: LocalWorkspace) {
  return 'rent-manager-' + workspace;
}

export function initialLedger(workspace: LocalWorkspace) {
  return workspace === 'demo' ? createDemoLedger() : emptyLedger();
}

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

// AsyncStorage has no read-modify-write transaction. All native callers share this queue.
export function createNativeLedgerStore(storage: Storage) {
  let tail: Promise<unknown> = Promise.resolve();
  return function modifyLocalLedger(
    workspace: LocalWorkspace, edit?: EditLedger, recovery?: Recovery,
  ): Promise<Ledger> {
    const key = '@rent-manager/' + workspace + '-ledger/v1';
    const change = tail.then(async () => {
      const saved = await storage.getItem(key);
      if (recovery) {
        if (saved !== recovery.original) throw new Error(staleRecovery);
        // Preserve the original first. If this write fails the live workspace stays intact.
        const folder = key + '/recovery/' + Date.now();
        let copy = folder;
        for (let i = 1; (await storage.getItem(copy)) !== null; i++) copy = folder + '-' + i;
        await storage.setItem(copy, saved);
        await storage.setItem(key, JSON.stringify(recovery.replacement));
        return recovery.replacement;
      }
      let current: unknown;
      if (saved === null) {
        current = initialLedger(workspace);
      } else {
        try {
          current = JSON.parse(saved);
        } catch {
          throw new UnreadableLedgerError(saved);
        }
      }
      checkStoredLedger(current, saved ?? undefined);
      const result = edit ? edit(current) : current;
      if (saved === null || edit) await storage.setItem(key, JSON.stringify(result));
      return result;
    });
    tail = change.catch(() => {});
    return change;
  };
}

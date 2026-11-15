import { createDemoLedger } from './demo.ts';
import { emptyLedger, type Ledger } from './model.ts';
import type { LocalWorkspace } from '../providers';

export type EditLedger = (current: Ledger) => Ledger;

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
  return function modifyLocalLedger(workspace: LocalWorkspace, edit?: EditLedger): Promise<Ledger> {
    const key = '@rent-manager/' + workspace + '-ledger/v1';
    const change = tail.then(async () => {
      const saved = await storage.getItem(key);
      const current: Ledger = saved === null ? initialLedger(workspace) : JSON.parse(saved);
      const result = edit ? edit(current) : current;
      if (saved === null || edit) await storage.setItem(key, JSON.stringify(result));
      return result;
    });
    tail = change.catch(() => {});
    return change;
  };
}

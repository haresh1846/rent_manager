import type { LocalWorkspace } from '../providers';
import type { Ledger } from './model';
import {
  checkStoredLedger, initialLedger, staleRecovery, webDatabaseName, type EditLedger, type Recovery,
} from './workspace';

const connections = new Map<LocalWorkspace, Promise<IDBDatabase>>();
function openDatabase(workspace: LocalWorkspace) {
  let connection = connections.get(workspace);
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(webDatabaseName(workspace), 1);
      req.onupgradeneeded = () => req.result.createObjectStore('ledger');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          connections.delete(workspace);
        };
        resolve(db);
      };
    }).catch((error) => {
      connections.delete(workspace);
      throw error;
    });
    connections.set(workspace, connection);
  }
  return connection;
}

// IndexedDB serializes read/write transactions across browser tabs on the same origin.
export async function modifyLocalLedger(
  workspace: LocalWorkspace, edit?: EditLedger, recovery?: Recovery,
): Promise<Ledger> {
  const db = await openDatabase(workspace);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ledger', 'readwrite');
    const store = tx.objectStore('ledger');
    const read = store.get('portfolio');
    let result: Ledger;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error ?? new Error('The local workspace could not be saved.'));
    read.onsuccess = () => {
      try {
        if (recovery) {
          if (JSON.stringify(read.result) !== recovery.original) throw new Error(staleRecovery);
          store.add(read.result, 'recovery/' + crypto.randomUUID());
          result = recovery.replacement;
          store.put(result, 'portfolio');
          return;
        }
        const data: unknown = read.result === undefined ? initialLedger(workspace) : read.result;
        checkStoredLedger(data);
        result = edit ? edit(data) : data;
        if (edit || read.result === undefined) store.put(result, 'portfolio');
      } catch (error) {
        tx.abort();
        reject(error);
      }
    };
  });
}

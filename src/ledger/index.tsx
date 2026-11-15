import { uuid } from 'expo';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ZodError } from 'zod';
import { useLocalWorkspace, type LocalWorkspace } from '../providers';
import type { LeaseFormData, PaymentFormData, PropertyFormData, TenantFormData } from '../types';
import { modifyLocalLedger } from './localStorage';
import { createBackup, parseBackup } from './backup';
import {
  applyCommand,
  emptyLedger,
  localDate,
  presentLedger,
  type Command,
  type Ledger,
  type Maintenance,
  type MaintenanceInput,
} from './model';
export { calculateMonth, isLeaseCurrent, localDate } from './model';
export type { Ledger, Maintenance, MaintenanceInput } from './model';

export interface RestorePreview {
  backup: ReturnType<typeof parseBackup>;
  baseline: string;
  currentCounts: Record<keyof Ledger, number>;
}

interface LedgerContextValue {
  data: Ledger;
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  exportBackup(): Promise<string>;
  prepareRestore(text: string): Promise<RestorePreview>;
  restoreBackup(preview: RestorePreview): Promise<void>;
  addProperty(input: PropertyFormData): Promise<void>;
  addTenant(input: TenantFormData): Promise<void>;
  updateProperty(id: string, input: PropertyFormData, expectedUpdatedAt?: string): Promise<void>;
  updateTenant(id: string, input: TenantFormData, expectedUpdatedAt?: string): Promise<void>;
  addLease(input: LeaseFormData): Promise<void>;
  endLease(id: string, endDate: string): Promise<void>;
  addPayment(input: PaymentFormData): Promise<void>;
  applyAdvance(leaseId: string, year: number, month: number, amount: number): Promise<void>;
  addMaintenance(input: MaintenanceInput): Promise<void>;
  setMaintenanceStatus(id: string, status: Maintenance['status']): Promise<void>;
}
const LedgerContext = createContext<LedgerContextValue | null>(null);

function readable(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message || 'Check the form values.';
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'The workspace could not be accessed. Please try again.';
}

export function useLedger() {
  const value = useContext(LedgerContext);
  if (!value) throw new Error('Open a workspace to access rental records.');
  return value;
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { workspace } = useLocalWorkspace();
  return (
    <Workspace key={workspace} workspace={workspace}>
      {children}
    </Workspace>
  );
}

function Workspace({ children, workspace }: { children: ReactNode; workspace: LocalWorkspace }) {
  const [data, setData] = useState<Ledger>(emptyLedger);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(new Map<string, Promise<void>>());

  const enqueue = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const job = queue.current.then(operation);
    queue.current = job.catch(() => {});
    return job;
  }, []);

  const sync = useCallback(
    (command?: Command) => {
      const signature = command ? JSON.stringify(command) : '';
      const duplicate = pending.current.get(signature);
      if (duplicate) return duplicate;
      const task = enqueue(async () => {
        if (!active.current && !command) return;
        try {
          const result = await modifyLocalLedger(
            workspace,
            command
              ? (current) => applyCommand(current, command, 'local-' + workspace, uuid.v4())
              : undefined
          );
          if (active.current) {
            setData(presentLedger(result));
            setError(null);
          }
        } catch (cause) {
          const message = readable(cause);
          if (!command && active.current) setError(message);
          throw new Error(message);
        } finally {
          if (active.current) setLoading(false);
        }
      });
      const completed = task.finally(() => pending.current.delete(signature));
      pending.current.set(signature, completed);
      return completed;
    },
    [enqueue, workspace]
  );

  useEffect(() => {
    active.current = true;
    const onFocus = () => {
      void sync().catch(() => {});
    };
    onFocus();
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('focus', onFocus);
    return () => {
      active.current = false;
      if (typeof window !== 'undefined' && window.removeEventListener)
        window.removeEventListener('focus', onFocus);
    };
  }, [sync]);

  const value: LedgerContextValue = {
    data,
    loading,
    error,
    refresh: () => sync(),
    exportBackup: () => enqueue(async () => createBackup(workspace, await modifyLocalLedger(workspace))),
    prepareRestore: (text) => enqueue(async () => {
      const backup = parseBackup(text, workspace);
      const current = await modifyLocalLedger(workspace);
      const currentCounts = {
        properties: current.properties.length,
        tenants: current.tenants.length,
        leases: current.leases.length,
        payments: current.payments.length,
        maintenance: current.maintenance.length,
      };
      return { backup, baseline: JSON.stringify(current), currentCounts };
    }),
    restoreBackup: ({ backup, baseline }) => enqueue(async () => {
      if (!active.current || backup.workspace !== workspace) {
        throw new Error('Reopen the backup in its original workspace.');
      }
      // Check inside the storage transaction so a second tab cannot write between the check and replacement.
      const result = await modifyLocalLedger(workspace, (current) => {
        if (JSON.stringify(current) !== baseline) {
          throw new Error('The workspace changed after the preview. Choose the backup again to review it.');
        }
        return backup.ledger;
      });
      if (active.current) {
        setData(presentLedger(result));
        setError(null);
      }
    }),
    addProperty: (input) => sync({ kind: 'property', input }),
    addTenant: (input) => sync({ kind: 'tenant', input }),
    updateProperty: (id, input, expectedUpdatedAt) =>
      sync({
        kind: 'update_property',
        input: {
          ...input,
          id,
          expected_updated_at: expectedUpdatedAt ?? data.properties.find((p) => p.id === id)?.updated_at,
        },
      }),
    updateTenant: (id, input, expectedUpdatedAt) =>
      sync({
        kind: 'update_tenant',
        input: {
          ...input,
          id,
          expected_updated_at: expectedUpdatedAt ?? data.tenants.find((t) => t.id === id)?.updated_at,
        },
      }),
    addLease: (input) => sync({ kind: 'lease', input }),
    endLease: (id, end_date) => sync({ kind: 'end_lease', input: { id, end_date } }),
    addPayment: (input) => sync({ kind: 'payment', input }),
    applyAdvance: (lease_id, year, month, amount) =>
      sync({
        kind: 'apply_advance',
        input: {
          lease_id,
          year,
          month,
          amount,
          payment_type: 'rent',
          payment_date: localDate(),
          notes: 'Advance applied to rent',
        },
      }),
    addMaintenance: (input) => sync({ kind: 'maintenance', input }),
    setMaintenanceStatus: (id, status) => sync({ kind: 'maintenance_status', input: { id, status } }),
  };
  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

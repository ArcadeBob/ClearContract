import { Contract } from '../types/contract';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';

type SetContracts = React.Dispatch<React.SetStateAction<Contract[]>>;

interface MutationOptions {
  /** Table name in Supabase. */
  table: 'contracts' | 'findings';
  /** Row ID to update/delete. */
  id: string;
  /** Columns to update (omit for delete). */
  updates?: Record<string, unknown>;
  /** Set to true for DELETE instead of UPDATE. */
  isDelete?: boolean;
  /** Error message shown to user on failure. */
  errorMessage: string;
}

/**
 * Performs an optimistic local state update followed by a Supabase write.
 * On failure, rolls back to the snapshot and shows an error toast.
 */
export async function optimisticMutation(
  contracts: Contract[],
  setContracts: SetContracts,
  applyLocally: () => void,
  { table, id, updates, isDelete, errorMessage }: MutationOptions,
  showToast: ReturnType<typeof useToast>['showToast'],
): Promise<void> {
  const snapshot = [...contracts];
  applyLocally();

  const query = isDelete
    ? supabase.from(table).delete().eq('id', id)
    : supabase.from(table).update(updates!).eq('id', id);

  const { error } = await query;

  if (error) {
    console.error(errorMessage, error);
    setContracts(snapshot);
    showToast({ type: 'error', message: `${errorMessage} Changes reverted.` });
  }
}

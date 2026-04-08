import { Contract } from '../types/contract';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

type SetContracts = React.Dispatch<React.SetStateAction<Contract[]>>;

type MutationOptions =
  | {
      table: 'contracts' | 'findings';
      id: string;
      updates: Record<string, unknown>;
      isDelete?: false;
      errorMessage: string;
    }
  | {
      table: 'contracts' | 'findings';
      id: string;
      isDelete: true;
      errorMessage: string;
    };

/**
 * Performs an optimistic local state update followed by a Supabase write.
 * On failure, rolls back to the snapshot and shows an error toast.
 */
export async function optimisticMutation(
  contracts: Contract[],
  setContracts: SetContracts,
  applyLocally: () => void,
  options: MutationOptions,
  showToast: ReturnType<typeof useToast>['showToast'],
): Promise<void> {
  const snapshot = [...contracts];
  applyLocally();

  const query = options.isDelete
    ? supabase.from(options.table).delete().eq('id', options.id)
    : supabase.from(options.table).update(options.updates).eq('id', options.id);

  const { error } = await query;

  if (error) {
    console.error(options.errorMessage, error);
    setContracts(snapshot);
    showToast({ type: 'error', message: `${options.errorMessage} Changes reverted.` });
  }
}

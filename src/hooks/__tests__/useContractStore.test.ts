import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Hoisted mocks for Supabase chain builder
const { mockFrom, mockShowToast } = vi.hoisted(() => {
  const mockShowToast = vi.fn();
  const mockFrom = vi.fn();
  return { mockFrom, mockShowToast };
});

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('../useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock mappers to pass through (the hook uses mapRow/mapRows)
vi.mock('../../lib/mappers', () => ({
  mapRow: <T,>(row: Record<string, unknown>): T => row as T,
  mapRows: <T,>(rows: Record<string, unknown>[]): T[] => rows as T[],
}));

import { useContractStore } from '../useContractStore';
import { createContract, createFinding } from '../../test/factories';

/**
 * Creates a chainable Supabase query builder mock.
 * Resolves with { data, error } when awaited.
 */
function createQueryMock(data: unknown[] = [], error: null | { message: string } = null) {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};
  mock.select = vi.fn(() => mock);
  mock.eq = vi.fn(() => mock);
  mock.insert = vi.fn(() => mock);
  mock.update = vi.fn(() => mock);
  mock.delete = vi.fn(() => mock);
  mock.single = vi.fn().mockResolvedValue({ data: data[0] ?? null, error });
  mock.order = vi.fn(() => mock);
  // Make it thenable so Promise.all / await resolves
  mock.then = vi.fn((resolve: (val: { data: unknown[]; error: typeof error }) => void) => {
    resolve({ data, error });
  });
  return mock;
}

describe('useContractStore', () => {
  let contractsQuery: ReturnType<typeof createQueryMock>;
  let findingsQuery: ReturnType<typeof createQueryMock>;
  let datesQuery: ReturnType<typeof createQueryMock>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: empty initial fetch
    contractsQuery = createQueryMock([]);
    findingsQuery = createQueryMock([]);
    datesQuery = createQueryMock([]);

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'contracts': return contractsQuery;
        case 'findings': return findingsQuery;
        case 'contract_dates': return datesQuery;
        default: return createQueryMock([]);
      }
    });
  });

  it('starts with isLoading true and empty contracts', () => {
    const { result } = renderHook(() => useContractStore());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.contracts).toEqual([]);
  });

  it('fetches contracts on mount and sets isLoading to false', async () => {
    const contract = { id: 'c1', name: 'Test', client: 'Client', type: 'Subcontract', uploadDate: '2026-01-01', status: 'Reviewed', riskScore: 50 };
    contractsQuery = createQueryMock([contract]);

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'contracts': return contractsQuery;
        case 'findings': return findingsQuery;
        case 'contract_dates': return datesQuery;
        default: return createQueryMock([]);
      }
    });

    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.contracts).toHaveLength(1);
    expect(result.current.contracts[0].id).toBe('c1');
    expect(result.current.contracts[0].findings).toEqual([]);
    expect(result.current.contracts[0].dates).toEqual([]);
  });

  it('stitches findings and dates onto matching contracts', async () => {
    const contract = { id: 'c1', name: 'Test', client: 'Client', type: 'Subcontract', uploadDate: '2026-01-01', status: 'Reviewed', riskScore: 50 };
    const finding = { id: 'f1', contractId: 'c1', severity: 'High', category: 'Legal Issues', title: 'Risk' };
    const date = { id: 'd1', contractId: 'c1', label: 'Start', date: '2026-01-01', type: 'Start' };

    contractsQuery = createQueryMock([contract]);
    findingsQuery = createQueryMock([finding]);
    datesQuery = createQueryMock([date]);

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'contracts': return contractsQuery;
        case 'findings': return findingsQuery;
        case 'contract_dates': return datesQuery;
        default: return createQueryMock([]);
      }
    });

    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.contracts[0].findings).toHaveLength(1);
    expect(result.current.contracts[0].findings[0].id).toBe('f1');
    expect(result.current.contracts[0].dates).toHaveLength(1);
    expect(result.current.contracts[0].dates[0].label).toBe('Start');
  });

  it('sets error when contract fetch fails', async () => {
    contractsQuery = createQueryMock([], { message: 'DB error' });
    // Make the thenable throw by resolving with error
    contractsQuery.then = vi.fn((resolve: (val: unknown) => void) => {
      resolve({ data: null, error: { message: 'DB error' } });
    });

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'contracts': return contractsQuery;
        case 'findings': return findingsQuery;
        case 'contract_dates': return datesQuery;
        default: return createQueryMock([]);
      }
    });

    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to load contracts');
  });

  it('addContract prepends a contract to the array', async () => {
    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newContract = createContract({ id: 'new-1', name: 'New Contract' });

    act(() => {
      result.current.addContract(newContract);
    });

    expect(result.current.contracts).toHaveLength(1);
    expect(result.current.contracts[0].id).toBe('new-1');
  });

  it('updateContract modifies an existing contract', async () => {
    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const contract = createContract({ id: 'upd-1', name: 'Original' });
    act(() => {
      result.current.addContract(contract);
    });

    act(() => {
      result.current.updateContract('upd-1', { name: 'Updated Name' });
    });

    expect(result.current.contracts[0].name).toBe('Updated Name');
    expect(result.current.contracts[0].id).toBe('upd-1');
  });

  it('deleteContract removes from array and calls Supabase delete', async () => {
    const deleteQuery = createQueryMock([]);
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contracts') {
        // Return different mocks for select vs delete
        const chainMock = createQueryMock([]);
        chainMock.delete = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });
        return chainMock;
      }
      return createQueryMock([]);
    });

    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const contract = createContract({ id: 'del-1', name: 'To Delete' });
    act(() => {
      result.current.addContract(contract);
    });
    expect(result.current.contracts).toHaveLength(1);

    await act(async () => {
      await result.current.deleteContract('del-1');
    });

    expect(result.current.contracts).toHaveLength(0);
  });

  it('deleteContract reverts on Supabase error and shows toast', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contracts') {
        const chainMock = createQueryMock([]);
        chainMock.delete = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Delete failed' } }),
        });
        return chainMock;
      }
      return createQueryMock([]);
    });

    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const contract = createContract({ id: 'del-fail', name: 'Keep Me' });
    act(() => {
      result.current.addContract(contract);
    });

    await act(async () => {
      await result.current.deleteContract('del-fail');
    });

    // Should revert
    expect(result.current.contracts).toHaveLength(1);
    expect(result.current.contracts[0].id).toBe('del-fail');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    );
  });

  it('toggleFindingResolved flips resolved status', async () => {
    // Set up with a contract that has a finding
    const finding = { id: 'f1', contractId: 'c1', severity: 'Medium', category: 'Legal Issues', title: 'Test', resolved: false };
    const contract = { id: 'c1', name: 'Test', client: 'Client', type: 'Subcontract', uploadDate: '2026-01-01', status: 'Reviewed', riskScore: 50 };

    contractsQuery = createQueryMock([contract]);
    findingsQuery = createQueryMock([finding]);

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'contracts': return contractsQuery;
        case 'findings': {
          const fMock = createQueryMock([finding]);
          fMock.update = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          });
          return fMock;
        }
        case 'contract_dates': return datesQuery;
        default: return createQueryMock([]);
      }
    });

    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.contracts[0].findings[0].resolved).toBe(false);

    await act(async () => {
      await result.current.toggleFindingResolved('c1', 'f1');
    });

    expect(result.current.contracts[0].findings[0].resolved).toBe(true);
  });

  it('renameContract updates name optimistically and calls Supabase', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contracts') {
        const chainMock = createQueryMock([]);
        chainMock.update = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });
        return chainMock;
      }
      return createQueryMock([]);
    });

    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const contract = createContract({ id: 'ren-1', name: 'Old Name' });
    act(() => {
      result.current.addContract(contract);
    });

    await act(async () => {
      await result.current.renameContract('ren-1', 'New Name');
    });

    expect(result.current.contracts[0].name).toBe('New Name');
  });

  it('exposes isUploading and setIsUploading', async () => {
    const { result } = renderHook(() => useContractStore());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isUploading).toBe(false);

    act(() => {
      result.current.setIsUploading(true);
    });

    expect(result.current.isUploading).toBe(true);
  });
});

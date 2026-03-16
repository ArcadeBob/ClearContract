import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../storage/contractStorage', () => ({
  loadContracts: vi.fn(() => ({ contracts: [], fromStorage: false })),
  saveContracts: vi.fn(() => ({ success: true })),
}));

import { useContractStore } from '../useContractStore';
import { loadContracts, saveContracts } from '../../storage/contractStorage';
import { createContract, createFinding } from '../../test/factories';

const mockedLoad = vi.mocked(loadContracts);
const mockedSave = vi.mocked(saveContracts);

describe('useContractStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLoad.mockReturnValue({ contracts: [], fromStorage: false });
    mockedSave.mockReturnValue({ success: true });
  });

  it('loads contracts from mocked loadContracts on init', () => {
    const c = createContract();
    mockedLoad.mockReturnValue({ contracts: [c], fromStorage: true });
    const { result } = renderHook(() => useContractStore());
    expect(result.current.contracts).toHaveLength(1);
    expect(result.current.contracts[0].id).toBe(c.id);
  });

  it('addContract prepends contract and calls saveContracts', () => {
    const { result } = renderHook(() => useContractStore());
    const c = createContract();
    act(() => {
      result.current.addContract(c);
    });
    expect(result.current.contracts).toHaveLength(1);
    expect(result.current.contracts[0].id).toBe(c.id);
    expect(mockedSave).toHaveBeenCalledWith(expect.any(Array));
  });

  it('updateContract merges partial updates by ID', () => {
    const c = createContract({ name: 'Original' });
    mockedLoad.mockReturnValue({ contracts: [c], fromStorage: true });
    const { result } = renderHook(() => useContractStore());
    act(() => {
      result.current.updateContract(c.id, { name: 'Updated' });
    });
    expect(result.current.contracts[0].name).toBe('Updated');
    expect(result.current.contracts[0].id).toBe(c.id);
  });

  it('deleteContract removes contract by ID', () => {
    const c = createContract();
    mockedLoad.mockReturnValue({ contracts: [c], fromStorage: true });
    const { result } = renderHook(() => useContractStore());
    expect(result.current.contracts).toHaveLength(1);
    act(() => {
      result.current.deleteContract(c.id);
    });
    expect(result.current.contracts).toHaveLength(0);
  });

  it('toggleFindingResolved flips false to true', () => {
    const finding = createFinding({ resolved: false });
    const c = createContract({ findings: [finding] });
    mockedLoad.mockReturnValue({ contracts: [c], fromStorage: true });
    const { result } = renderHook(() => useContractStore());
    act(() => {
      result.current.toggleFindingResolved(c.id, finding.id);
    });
    expect(result.current.contracts[0].findings[0].resolved).toBe(true);
  });

  it('toggleFindingResolved flips true to false', () => {
    const finding = createFinding({ resolved: true });
    const c = createContract({ findings: [finding] });
    mockedLoad.mockReturnValue({ contracts: [c], fromStorage: true });
    const { result } = renderHook(() => useContractStore());
    act(() => {
      result.current.toggleFindingResolved(c.id, finding.id);
    });
    expect(result.current.contracts[0].findings[0].resolved).toBe(false);
  });

  it('updateFindingNote sets note string on matching finding', () => {
    const finding = createFinding({ note: '' });
    const c = createContract({ findings: [finding] });
    mockedLoad.mockReturnValue({ contracts: [c], fromStorage: true });
    const { result } = renderHook(() => useContractStore());
    act(() => {
      result.current.updateFindingNote(c.id, finding.id, 'my note');
    });
    expect(result.current.contracts[0].findings[0].note).toBe('my note');
  });

  it('updateFindingNote with undefined sets note to empty string', () => {
    const finding = createFinding({ note: 'existing' });
    const c = createContract({ findings: [finding] });
    mockedLoad.mockReturnValue({ contracts: [c], fromStorage: true });
    const { result } = renderHook(() => useContractStore());
    act(() => {
      result.current.updateFindingNote(c.id, finding.id, undefined);
    });
    expect(result.current.contracts[0].findings[0].note).toBe('');
  });

  it('storageWarning appears when saveContracts returns failure', () => {
    const { result } = renderHook(() => useContractStore());
    mockedSave.mockReturnValue({ success: false, error: 'Storage is full' });
    const c = createContract();
    act(() => {
      result.current.addContract(c);
    });
    expect(result.current.storageWarning).toBe('Storage is full');
  });

  it('dismissStorageWarning clears storageWarning to null', () => {
    const { result } = renderHook(() => useContractStore());
    mockedSave.mockReturnValue({ success: false, error: 'Storage is full' });
    const c = createContract();
    act(() => {
      result.current.addContract(c);
    });
    expect(result.current.storageWarning).toBe('Storage is full');
    act(() => {
      result.current.dismissStorageWarning();
    });
    expect(result.current.storageWarning).toBeNull();
  });

  it('migrationWarning from loadContracts surfaces as storageWarning', () => {
    mockedLoad.mockReturnValue({
      contracts: [],
      fromStorage: true,
      migrationWarning: 'Migrated from v1',
    });
    const { result } = renderHook(() => useContractStore());
    expect(result.current.storageWarning).toBe('Migrated from v1');
  });

  it('setIsUploading toggles uploading state', () => {
    const { result } = renderHook(() => useContractStore());
    expect(result.current.isUploading).toBe(false);
    act(() => {
      result.current.setIsUploading(true);
    });
    expect(result.current.isUploading).toBe(true);
    act(() => {
      result.current.setIsUploading(false);
    });
    expect(result.current.isUploading).toBe(false);
  });
});

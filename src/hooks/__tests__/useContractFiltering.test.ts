import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../storage/storageManager', () => ({
  loadRaw: vi.fn(() => ({ data: null })),
  saveRaw: vi.fn(() => ({ ok: true })),
}));

import { useContractFiltering } from '../useContractFiltering';
import { loadRaw, saveRaw } from '../../storage/storageManager';
import { createFinding } from '../../test/factories';
import type { Finding } from '../../types/contract';

// --- Fixture data ---

const criticalLegal = createFinding({
  severity: 'Critical',
  category: 'Legal Issues',
  actionPriority: 'pre-bid',
  negotiationPosition: 'Strongly negotiate',
});

const lowScope = createFinding({
  severity: 'Low',
  category: 'Scope of Work',
  actionPriority: 'monitor',
  negotiationPosition: '',
});

const mediumFinancial = createFinding({
  severity: 'Medium',
  category: 'Financial Terms',
  actionPriority: 'pre-bid',
  negotiationPosition: 'Request amendment',
});

const highLegal = createFinding({
  severity: 'High',
  category: 'Legal Issues',
  actionPriority: 'pre-sign',
  negotiationPosition: 'Negotiate clause removal',
});

const resolvedFinding = createFinding({
  severity: 'High',
  category: 'Legal Issues',
  resolved: true,
  actionPriority: 'monitor',
  negotiationPosition: 'Accept as-is',
});

const infoRisk = createFinding({
  severity: 'Info',
  category: 'Risk Assessment',
  actionPriority: 'monitor',
  negotiationPosition: '',
});

const allFindings: Finding[] = [criticalLegal, lowScope, mediumFinancial, highLegal, resolvedFinding, infoRisk];

describe('useContractFiltering', () => {
  beforeEach(() => {
    vi.mocked(loadRaw).mockReturnValue({ data: null, ok: true, error: null, quotaExceeded: false });
    vi.mocked(saveRaw).mockReturnValue({ ok: true, data: null, error: null, quotaExceeded: false });
  });

  // Test 1
  it('default state has all severities, categories, and priorities selected, negotiationOnly=false', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    expect(result.current.filters.severities.size).toBe(5);
    expect(result.current.filters.categories.size).toBe(10);
    expect(result.current.filters.priorities.size).toBe(3);
    expect(result.current.filters.negotiationOnly).toBe(false);
  });

  // Test 2
  it('visibleFindings returns all findings when no filters applied', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    expect(result.current.visibleFindings).toHaveLength(allFindings.length);
  });

  // Test 3
  it('toggleFilter severities removes Low findings from visibleFindings', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    act(() => { result.current.toggleFilter('severities', 'Low'); });
    expect(result.current.visibleFindings).not.toContainEqual(
      expect.objectContaining({ severity: 'Low' })
    );
    // Other severities remain
    expect(result.current.visibleFindings.length).toBe(allFindings.length - 1);
  });

  // Test 4
  it('toggling same severity twice re-adds it', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    act(() => { result.current.toggleFilter('severities', 'Low'); });
    expect(result.current.filters.severities.has('Low')).toBe(false);
    act(() => { result.current.toggleFilter('severities', 'Low'); });
    expect(result.current.filters.severities.has('Low')).toBe(true);
    expect(result.current.visibleFindings).toHaveLength(allFindings.length);
  });

  // Test 5
  it('toggleFilter categories removes that category', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    act(() => { result.current.toggleFilter('categories', 'Legal Issues'); });
    expect(result.current.visibleFindings).not.toContainEqual(
      expect.objectContaining({ category: 'Legal Issues' })
    );
  });

  // Test 6
  it('toggleFilter priorities with priority filter active excludes findings without matching priority', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    // Remove 'monitor' and 'pre-sign' from priorities, keeping only 'pre-bid'
    act(() => { result.current.toggleFilter('priorities', 'monitor'); });
    act(() => { result.current.toggleFilter('priorities', 'pre-sign'); });
    // Only findings with actionPriority='pre-bid' should remain
    expect(result.current.visibleFindings.every(f => f.actionPriority === 'pre-bid')).toBe(true);
    expect(result.current.visibleFindings.length).toBeGreaterThan(0);
  });

  // Test 7
  it('toggleFilter negotiationOnly shows only findings with negotiationPosition', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    act(() => { result.current.toggleFilter('negotiationOnly'); });
    // Only findings with truthy negotiationPosition should remain
    expect(result.current.visibleFindings.every(f => !!f.negotiationPosition)).toBe(true);
    // lowScope and infoRisk have empty string negotiationPosition, so they should be excluded
    expect(result.current.visibleFindings).not.toContainEqual(
      expect.objectContaining({ id: lowScope.id })
    );
    expect(result.current.visibleFindings).not.toContainEqual(
      expect.objectContaining({ id: infoRisk.id })
    );
  });

  // Test 8
  it('hideResolved=true excludes resolved findings', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    act(() => { result.current.toggleHideResolved(); });
    expect(result.current.hideResolved).toBe(true);
    expect(result.current.visibleFindings).not.toContainEqual(
      expect.objectContaining({ resolved: true })
    );
  });

  // Test 9
  it('toggleHideResolved calls saveRaw with clearcontract:hide-resolved', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    act(() => { result.current.toggleHideResolved(); });
    expect(saveRaw).toHaveBeenCalledWith('clearcontract:hide-resolved', 'true');
  });

  // Test 10
  it('hideResolved initial value loaded from loadRaw', () => {
    vi.mocked(loadRaw).mockReturnValue({ data: 'true', ok: true, error: null, quotaExceeded: false });
    const { result } = renderHook(() => useContractFiltering({ findings: [resolvedFinding, criticalLegal] }));
    expect(result.current.hideResolved).toBe(true);
    expect(result.current.visibleFindings).not.toContainEqual(
      expect.objectContaining({ resolved: true })
    );
  });

  // Test 11
  it('resetFilters restores all defaults', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    // Apply several filters
    act(() => { result.current.toggleFilter('severities', 'Low'); });
    act(() => { result.current.toggleFilter('categories', 'Legal Issues'); });
    act(() => { result.current.toggleFilter('negotiationOnly'); });
    // Reset
    act(() => { result.current.resetFilters(); });
    expect(result.current.filters.severities.size).toBe(5);
    expect(result.current.filters.categories.size).toBe(10);
    expect(result.current.filters.priorities.size).toBe(3);
    expect(result.current.filters.negotiationOnly).toBe(false);
    expect(result.current.visibleFindings).toHaveLength(allFindings.length);
  });

  // Test 12
  it('groupedFindings groups by category and sorts within group by severity rank', () => {
    const findings = [criticalLegal, highLegal, mediumFinancial];
    const { result } = renderHook(() => useContractFiltering({ findings }));
    const legalGroup = result.current.groupedFindings.find(g => g.category === 'Legal Issues');
    expect(legalGroup).toBeDefined();
    expect(legalGroup!.findings[0].severity).toBe('Critical');
    expect(legalGroup!.findings[1].severity).toBe('High');
  });

  // Test 13
  it('groupedFindings groups sorted by most-severe finding, then by count', () => {
    // Legal group has Critical (rank 0), Financial has Medium (rank 2)
    const findings = [criticalLegal, highLegal, mediumFinancial, lowScope];
    const { result } = renderHook(() => useContractFiltering({ findings }));
    const groups = result.current.groupedFindings;
    // Legal Issues should come first (has Critical=0)
    expect(groups[0].category).toBe('Legal Issues');
    // Financial Terms or Scope of Work next -- both Medium/Low respectively
    // Medium (rank 2) < Low (rank 3), so Financial Terms before Scope of Work
    expect(groups[1].category).toBe('Financial Terms');
    expect(groups[2].category).toBe('Scope of Work');
  });

  // Test 14
  it('groupedFindings excludes empty groups', () => {
    const findings = [criticalLegal];
    const { result } = renderHook(() => useContractFiltering({ findings }));
    const groups = result.current.groupedFindings;
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('Legal Issues');
  });

  // Test 15
  it('flatFindings sorted by severity rank (Critical=0 first, Info=4 last)', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    const severities = result.current.flatFindings.map(f => f.severity);
    const rankOrder = ['Critical', 'High', 'High', 'Medium', 'Low', 'Info'];
    expect(severities).toEqual(rankOrder);
  });

  // Test 16
  it('re-render with different findings updates visibleFindings', () => {
    const { result, rerender } = renderHook(
      ({ findings }) => useContractFiltering({ findings }),
      { initialProps: { findings: allFindings } }
    );
    expect(result.current.visibleFindings).toHaveLength(allFindings.length);
    rerender({ findings: [criticalLegal] });
    expect(result.current.visibleFindings).toHaveLength(1);
  });

  // Test 17
  it('multiple filters applied simultaneously (intersection logic)', () => {
    const { result } = renderHook(() => useContractFiltering({ findings: allFindings }));
    // Keep only Critical severity + Legal Issues category
    act(() => { result.current.toggleFilter('severities', 'High'); });
    act(() => { result.current.toggleFilter('severities', 'Medium'); });
    act(() => { result.current.toggleFilter('severities', 'Low'); });
    act(() => { result.current.toggleFilter('severities', 'Info'); });
    act(() => { result.current.toggleFilter('categories', 'Scope of Work'); });
    act(() => { result.current.toggleFilter('categories', 'Financial Terms'); });
    act(() => { result.current.toggleFilter('categories', 'Risk Assessment'); });
    act(() => {
      result.current.toggleFilter('categories', 'Insurance Requirements');
      result.current.toggleFilter('categories', 'Contract Compliance');
      result.current.toggleFilter('categories', 'Labor Compliance');
      result.current.toggleFilter('categories', 'Important Dates');
      result.current.toggleFilter('categories', 'Technical Standards');
      result.current.toggleFilter('categories', 'Compound Risk');
    });
    // Only Critical + Legal Issues should remain
    expect(result.current.visibleFindings).toHaveLength(1);
    expect(result.current.visibleFindings[0].severity).toBe('Critical');
    expect(result.current.visibleFindings[0].category).toBe('Legal Issues');
  });
});

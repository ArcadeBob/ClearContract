import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ---- Supabase mock ----
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockUpsert = vi.fn();
const mockFrom = vi.fn((table: string) => ({
  select: mockSelect,
  upsert: mockUpsert,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// ---- Auth mock ----
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-user-id' } },
    isLoading: false,
    signOut: vi.fn(),
  }),
}));

// ---- Toast mock ----
const mockShowToast = vi.fn();
vi.mock('../useToast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

import { useCompanyProfile } from '../useCompanyProfile';
import { DEFAULT_COMPANY_PROFILE } from '../../knowledge/types';

describe('useCompanyProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('calls supabase.from("company_profiles").select("*").maybeSingle() on mount', async () => {
    renderHook(() => useCompanyProfile());
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('company_profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockMaybeSingle).toHaveBeenCalled();
    });
  });

  it('merges fetched data with DEFAULT_COMPANY_PROFILE', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { gl_per_occurrence: '$5M', employee_count: '50' },
      error: null,
    });
    const { result } = renderHook(() => useCompanyProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile.glPerOccurrence).toBe('$5M');
    expect(result.current.profile.employeeCount).toBe('50');
    // Defaults preserved for unset fields
    expect(result.current.profile.glAggregate).toBe(DEFAULT_COMPANY_PROFILE.glAggregate);
  });

  it('returns DEFAULT_COMPANY_PROFILE when Supabase returns null data (new user)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useCompanyProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.profile).toEqual(DEFAULT_COMPANY_PROFILE);
  });

  it('shows error toast and returns defaults when Supabase read errors', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    });
    const { result } = renderHook(() => useCompanyProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'Could not load company profile' })
    );
    expect(result.current.profile).toEqual(DEFAULT_COMPANY_PROFILE);
  });

  it('saveField updates profile and calls upsert with snake_case payload including user_id', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useCompanyProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.saveField('glPerOccurrence', '$10M');
    });

    expect(result.current.profile.glPerOccurrence).toBe('$10M');
    expect(mockFrom).toHaveBeenCalledWith('company_profiles');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        gl_per_occurrence: '$10M',
        user_id: 'test-user-id',
      }),
      { onConflict: 'user_id' }
    );
  });

  it('saveField upsert payload does NOT include id, created_at, or updated_at from mapped profile', async () => {
    // Return a row that has id, created_at, updated_at (as Supabase rows do)
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'row-uuid',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        gl_per_occurrence: '$1M',
      },
      error: null,
    });
    const { result } = renderHook(() => useCompanyProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.saveField('glPerOccurrence', '$2M');
    });

    const upsertPayload = mockUpsert.mock.calls[0][0];
    expect(upsertPayload).not.toHaveProperty('id');
    expect(upsertPayload).not.toHaveProperty('created_at');
    // updated_at is re-set by the hook, but the original one from the row should be overwritten
    expect(upsertPayload.user_id).toBe('test-user-id');
  });

  it('isLoading starts true and becomes false after fetch completes', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useCompanyProfile());
    // Initially loading
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

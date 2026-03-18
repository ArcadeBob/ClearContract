import { useState, useEffect, useCallback } from 'react';
import { CompanyProfile, DEFAULT_COMPANY_PROFILE } from '../knowledge/types';
import { supabase } from '../lib/supabase';
import { mapRow } from '../lib/mappers';
import { mapToSnake } from '../lib/mappers';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './useToast';

export function useCompanyProfile() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        showToast({ type: 'error', message: 'Could not load company profile' });
        setIsLoading(false);
        return;
      }

      if (data) {
        const mapped = mapRow<CompanyProfile>(data);
        setProfile({ ...DEFAULT_COMPANY_PROFILE, ...mapped });
      }
      // If no data (null): keep defaults (new user)

      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveField = useCallback(
    <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
      setProfile((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };

        const payload = mapToSnake(next as unknown as Record<string, unknown>);
        delete payload.id;
        delete payload.created_at;
        delete payload.updated_at;
        payload.user_id = session!.user.id;
        payload.updated_at = new Date().toISOString();

        supabase
          .from('company_profiles')
          .upsert(payload, { onConflict: 'user_id' })
          .then(({ error }) => {
            if (error) {
              showToast({ type: 'error', message: 'Could not save profile change' });
            }
          });

        return next;
      });
    },
    [session, showToast]
  );

  return { profile, saveField, isLoading };
}

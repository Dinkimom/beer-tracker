'use client';

import { useEffect, useState } from 'react';

import { fetchOnPremSetupState } from '@/lib/api/onprem';

interface RegisterSetupState {
  onPremMode: boolean;
  setupInitialized: boolean;
  setupLoading: boolean;
}

export function useRegisterSetupState(): RegisterSetupState {
  const [setupLoading, setSetupLoading] = useState(true);
  const [onPremMode, setOnPremMode] = useState(true);
  const [setupInitialized, setSetupInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSetupState() {
      try {
        const data = await fetchOnPremSetupState();
        if (cancelled) {
          return;
        }
        setOnPremMode(Boolean(data.onPremMode));
        setSetupInitialized(Boolean(data.initialized));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setSetupLoading(false);
        }
      }
    }
    void loadSetupState();
    return () => {
      cancelled = true;
    };
  }, []);

  return { setupLoading, onPremMode, setupInitialized };
}

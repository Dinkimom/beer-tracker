'use client';

import type { ReactNode } from 'react';

import { createContext, useContext } from 'react';

import {
  usePlanningPhaseCardColorSchemeStorage,
  type PlanningPhaseCardColorScheme,
} from '@/hooks/useLocalStorage';

const PhaseCardColorSchemeContext = createContext<PlanningPhaseCardColorScheme>('status');

export function PhaseCardColorSchemeProvider({ children }: { children: ReactNode }) {
  const [scheme] = usePlanningPhaseCardColorSchemeStorage();
  return (
    <PhaseCardColorSchemeContext.Provider value={scheme}>{children}</PhaseCardColorSchemeContext.Provider>
  );
}

export function usePhaseCardColorScheme(): PlanningPhaseCardColorScheme {
  return useContext(PhaseCardColorSchemeContext);
}

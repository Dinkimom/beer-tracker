'use client';

import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { ReactNode } from 'react';

import { PhaseCardColorSchemeContext } from '@/components/PhaseCardColorSchemeContext';

/** Локальный override схемы (нейтральные карточки канбана и т.п.). */
export function PhaseCardColorSchemeOverride({
  children,
  value,
}: {
  children: ReactNode;
  value: PlanningPhaseCardColorScheme;
}) {
  return (
    <PhaseCardColorSchemeContext.Provider value={value}>{children}</PhaseCardColorSchemeContext.Provider>
  );
}

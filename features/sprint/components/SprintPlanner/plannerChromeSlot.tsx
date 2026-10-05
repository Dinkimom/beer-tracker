'use client';

import type { ReactNode } from 'react';

import { createContext, useContext } from 'react';

const PlannerChromeSlotContext = createContext<HTMLElement | null>(null);

export function PlannerChromeSlotProvider({
  children,
  slot,
}: {
  children: ReactNode;
  slot: HTMLElement | null;
}) {
  return <PlannerChromeSlotContext.Provider value={slot}>{children}</PlannerChromeSlotContext.Provider>;
}

export function usePlannerChromeSlot(): HTMLElement | null {
  return useContext(PlannerChromeSlotContext);
}

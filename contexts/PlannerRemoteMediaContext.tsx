'use client';

import { createContext, useContext, type ReactNode } from 'react';

const PlannerRemoteMediaContext = createContext(true);

interface PlannerRemoteMediaProviderProps {
  children: ReactNode;
  /** false — не грузить удалённые фото/схемы карточек (пока виден полноэкранный лоадер). */
  enabled: boolean;
}

export function PlannerRemoteMediaProvider({ children, enabled }: PlannerRemoteMediaProviderProps) {
  return (
    <PlannerRemoteMediaContext.Provider value={enabled}>{children}</PlannerRemoteMediaContext.Provider>
  );
}

export function usePlannerRemoteMediaEnabled(): boolean {
  return useContext(PlannerRemoteMediaContext);
}

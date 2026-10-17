'use client';

import { createContext, type ReactNode, useContext } from 'react';

const defaultValue = { isDemoPlanner: false };

const DemoPlannerShellContext = createContext(defaultValue);

/** Wraps `/demo/planner`: disables current-user fetch and avatar in header. */
export function DemoPlannerShellProvider({ children }: { children: ReactNode }) {
  return (
    <DemoPlannerShellContext.Provider value={{ isDemoPlanner: true }}>
      {children}
    </DemoPlannerShellContext.Provider>
  );
}

export function useDemoPlannerShell() {
  return useContext(DemoPlannerShellContext);
}

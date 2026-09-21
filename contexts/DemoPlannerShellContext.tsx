'use client';

import { createContext, useContext } from 'react';

const defaultValue = { isDemoPlanner: false };

const DemoPlannerShellContext = createContext(defaultValue);

export function useDemoPlannerShell() {
  return useContext(DemoPlannerShellContext);
}

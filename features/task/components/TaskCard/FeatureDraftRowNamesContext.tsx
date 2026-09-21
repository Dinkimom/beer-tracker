'use client';

import { createContext, useContext, type ReactNode } from 'react';

const emptyDraftRowNames = new Map<string, string>();

const FeatureDraftRowNamesContext = createContext<ReadonlyMap<string, string>>(emptyDraftRowNames);

export function FeatureDraftRowNamesProvider({
  children,
  names,
}: {
  children: ReactNode;
  names: ReadonlyMap<string, string>;
}) {
  return (
    <FeatureDraftRowNamesContext.Provider value={names}>
      {children}
    </FeatureDraftRowNamesContext.Provider>
  );
}

export function useFeatureDraftRowNames(): ReadonlyMap<string, string> {
  return useContext(FeatureDraftRowNamesContext);
}

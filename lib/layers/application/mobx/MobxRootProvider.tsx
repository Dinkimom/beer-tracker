'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import { createRootStore, type RootStore } from './createRootStore';

const MobxRootContext = createContext<RootStore | null>(null);

export function MobxRootProvider({ children }: { readonly children: ReactNode }) {
  const [store] = useState(() => createRootStore());
  return <MobxRootContext.Provider value={store}>{children}</MobxRootContext.Provider>;
}

export function useRootStore(): RootStore {
  const store = useContext(MobxRootContext);
  if (!store) {
    throw new Error('useRootStore must be used within MobxRootProvider');
  }
  return store;
}

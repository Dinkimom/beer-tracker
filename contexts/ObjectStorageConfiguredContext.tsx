'use client';

import type { ReactNode } from 'react';

import { createContext, useContext } from 'react';

const ObjectStorageConfiguredContext = createContext(true);

/** Server-known flag: required `S3_*` env vars are present. */
export function ObjectStorageConfiguredProvider({
  children,
  configured,
}: {
  children: ReactNode;
  configured: boolean;
}) {
  return (
    <ObjectStorageConfiguredContext.Provider value={configured}>
      {children}
    </ObjectStorageConfiguredContext.Provider>
  );
}

export function useObjectStorageConfigured(): boolean {
  return useContext(ObjectStorageConfiguredContext);
}

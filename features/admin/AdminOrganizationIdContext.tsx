'use client';

import { createContext, useContext, type ReactNode } from 'react';

const AdminOrganizationIdContext = createContext<string>('');

export function AdminOrganizationIdProvider({
  children,
  organizationId,
}: {
  children: ReactNode;
  organizationId: string;
}) {
  return (
    <AdminOrganizationIdContext.Provider value={organizationId}>
      {children}
    </AdminOrganizationIdContext.Provider>
  );
}

export function useAdminOrganizationId(): string {
  return useContext(AdminOrganizationIdContext);
}

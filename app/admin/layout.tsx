import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AdminOrganizationIdProvider } from '@/features/admin/AdminOrganizationIdContext';
import { AdminShell } from '@/features/admin/AdminShell';
import { getCachedAdminOrganizationContext } from '@/lib/access/adminOrganizationContext';
import { findUserById, getVerifiedProductUserIdFromServerCookies } from '@/lib/auth';
import { isExporterEnabled } from '@/lib/env';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userId = await getVerifiedProductUserIdFromServerCookies();
  if (!userId) {
    redirect('/auth-setup?next=/admin');
  }
  const [user, adminCtx] = await Promise.all([findUserById(userId), getCachedAdminOrganizationContext(userId)]);
  if (!user) {
    redirect('/auth-setup?next=/admin');
  }

  const { activeOrganizationId, isSuperAdmin, orgs } = adminCtx;
  const exporterEnabled = isExporterEnabled();

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-gray-50 dark:bg-background">
      <Suspense fallback={<div className="h-full" />}>
        <AdminOrganizationIdProvider organizationId={activeOrganizationId}>
          <AdminShell
            email={user.email}
            exporterEnabled={exporterEnabled}
            isSuperAdmin={isSuperAdmin}
            orgs={orgs}
          >
            {children}
          </AdminShell>
        </AdminOrganizationIdProvider>
      </Suspense>
    </div>
  );
}

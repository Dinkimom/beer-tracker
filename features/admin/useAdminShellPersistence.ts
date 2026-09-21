import { useEffect } from 'react';

import { persistActiveOrganizationId } from '@/features/admin/AdminShellHelpers';

export function useAdminShellPersistence(connectOrgId: string | null): void {
  useEffect(() => {
    persistActiveOrganizationId(connectOrgId);
  }, [connectOrgId]);
}

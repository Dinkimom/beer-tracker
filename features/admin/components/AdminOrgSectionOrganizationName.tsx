'use client';

import type { UserOrganizationSummary } from '@/lib/organizations';

export function AdminOrgSectionOrganizationName({
  canRename,
  organization,
}: {
  canRename: boolean;
  organization: UserOrganizationSummary | null;
}) {
  if (!organization || canRename) {
    return null;
  }
  return <p className="font-medium text-gray-900 dark:text-gray-100">{organization.name}</p>;
}

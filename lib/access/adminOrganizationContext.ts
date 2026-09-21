/**
 * Контекст организации для админки: кэш на запрос (React cache).
 */

import type { UserOrganizationSummary } from '@/lib/organizations';

import { cache } from 'react';

import { enrichOrganizationSummariesForUser } from '@/lib/access/orgAccess';
import { resolvePrimaryAdminOrganizationId } from '@/lib/access/resolvePrimaryAdminOrganization';
import { isProductSuperAdmin } from '@/lib/auth/superAdmin';
import {
  listAllOrganizationsAdminSummaries,
  listUserOrganizations,
} from '@/lib/organizations';

interface AdminOrganizationRequestContext {
  activeOrganizationId: string;
  isSuperAdmin: boolean;
  orgs: UserOrganizationSummary[];
}

/**
 * Один вызов на HTTP-запрос (layout + страницы админки).
 */
export const getCachedAdminOrganizationContext = cache(
  async (userId: string): Promise<AdminOrganizationRequestContext> => {
    const superAdmin = await isProductSuperAdmin(userId);
    const orgs = superAdmin
      ? await listAllOrganizationsAdminSummaries()
      : await enrichOrganizationSummariesForUser(userId, await listUserOrganizations(userId));

    return {
      activeOrganizationId: resolvePrimaryAdminOrganizationId(orgs),
      isSuperAdmin: superAdmin,
      orgs,
    };
  }
);

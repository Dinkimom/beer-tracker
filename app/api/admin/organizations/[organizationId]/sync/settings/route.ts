import { NextResponse } from 'next/server';

import { parseAdminOrgJsonBody } from '@/lib/admin/adminOrgSyncActionHelpers';
import { patchOrganizationSyncSettings } from '@/lib/admin/adminSyncSettingsHelpers';
import { OrgSyncSettingsPartialSchema } from '@/lib/orgSyncSettings';

const AdminSyncPatchSchema = OrgSyncSettingsPartialSchema.omit({ lastFullRescanAt: true });

/**
 * PATCH /api/admin/organizations/[organizationId]/sync/settings
 * org_admin: обновляет `organizations.settings.sync` (интервал, overlap, лимиты, enabled).
 */
export async function PATCH(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const parsed = await parseAdminOrgJsonBody(
    request,
    AdminSyncPatchSchema,
    'Некорректные поля настроек синхронизации'
  );
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  return patchOrganizationSyncSettings(request, organizationId, parsed);
}

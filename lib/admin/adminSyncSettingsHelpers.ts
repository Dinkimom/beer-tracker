import { NextResponse } from 'next/server';

import { getSyncPlatformEnv } from '@/lib/env';
import { findOrganizationById, updateOrganization } from '@/lib/organizations';
import {
  mergeOrganizationSettingsSyncPatch,
  parseResolveAndValidateOrgSyncFromSettingsRoot,
  type OrgSyncSettingsPartial,
} from '@/lib/orgSyncSettings';

import { requireAdminOrganization } from './adminOrgSyncActionHelpers';

export async function patchOrganizationSyncSettings(
  request: Request,
  organizationId: string,
  patch: OrgSyncSettingsPartial
): Promise<NextResponse> {
  const authResult = await requireAdminOrganization(request, organizationId);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      {
        error:
          'Передайте хотя бы одно поле (enabled, intervalMinutes, overlapMinutes, maxIssuesPerRun, extraQueueKeys, windowUtc)',
      },
      { status: 400 }
    );
  }
  const org = await findOrganizationById(authResult.org.id);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  const platform = getSyncPlatformEnv();
  const newSettings = mergeOrganizationSettingsSyncPatch(org.settings, patch);
  const validation = parseResolveAndValidateOrgSyncFromSettingsRoot(newSettings, platform);
  if (!validation.ok) {
    return NextResponse.json({ code: validation.code, error: validation.message }, { status: 422 });
  }
  const updated = await updateOrganization(org.id, { settings: newSettings });
  if (!updated) {
    return NextResponse.json({ error: 'Не удалось сохранить' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, resolvedSync: validation.settings });
}

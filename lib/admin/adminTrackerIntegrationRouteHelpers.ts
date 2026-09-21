import { NextResponse } from 'next/server';

import { findOrganizationById, updateOrganization } from '@/lib/organizations';
import {
  extractTrackerIntegrationJson,
  mergeOrganizationSettingsTrackerIntegration,
  parseTrackerIntegrationStored,
  type TrackerIntegrationStored,
} from '@/lib/trackerIntegration';

import { requireMemberOrganization } from './adminOrgRouteHelpers';
import { parseTrackerIntegrationPutBody } from './adminTrackerIntegrationPutHelpers';

function emptyStored(revision: number): TrackerIntegrationStored {
  return { configRevision: revision };
}

export async function saveTrackerIntegrationConfig(
  request: Request,
  organizationId: string
): Promise<NextResponse> {
  const authResult = await requireMemberOrganization(request, organizationId);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const body = await parseTrackerIntegrationPutBody(request);
  if (body instanceof NextResponse) {
    return body;
  }

  const org = await findOrganizationById(authResult.org.id);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }

  const prev = parseTrackerIntegrationStored(extractTrackerIntegrationJson(org.settings));
  const nextRevision = (prev?.configRevision ?? 0) + 1;
  const stored: TrackerIntegrationStored = {
    ...(body as TrackerIntegrationStored),
    configRevision: nextRevision,
  };

  const newSettings = mergeOrganizationSettingsTrackerIntegration(org.settings, stored);
  const updated = await updateOrganization(org.id, { settings: newSettings });
  if (!updated) {
    return NextResponse.json({ error: 'Не удалось сохранить' }, { status: 500 });
  }

  return NextResponse.json({ config: stored, ok: true });
}

export async function getTrackerIntegrationConfig(
  request: Request,
  organizationId: string
): Promise<NextResponse> {
  const authResult = await requireMemberOrganization(request, organizationId);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const parsed = parseTrackerIntegrationStored(
    extractTrackerIntegrationJson(authResult.org.settings)
  );
  return NextResponse.json({ config: parsed ?? emptyStored(0) });
}

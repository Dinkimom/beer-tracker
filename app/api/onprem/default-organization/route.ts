import { NextResponse } from 'next/server';

import { organizationIssueTrackerPublicDto } from '@/lib/issueTrackerProvider/settings';
import { readOnPremSetupState } from '@/lib/onPrem/setupState';
import { fetchFirstOrganizationId, findOrganizationById } from '@/lib/organizations';

/**
 * GET /api/onprem/default-organization — первая организация продукта и её трекер
 * (для экрана входа по токену трекера). После инициализации; без аутентификации.
 */
export async function GET() {
  const setup = await readOnPremSetupState();
  if (!setup.hasOrganizations) {
    return NextResponse.json({ error: 'Инициализация не завершена' }, { status: 404 });
  }
  const id = await fetchFirstOrganizationId();
  const org = id ? await findOrganizationById(id) : null;
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  return NextResponse.json({
    issueTracker: organizationIssueTrackerPublicDto(org.settings),
    organizationId: org.id,
  });
}

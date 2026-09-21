import { NextResponse } from 'next/server';

import {
  insertOrganization,
  insertOrganizationMember,
  listUserOrganizations,
} from '@/lib/organizations';
import { buildDefaultTrackerIntegrationStored, mergeOrganizationSettingsTrackerIntegration } from '@/lib/trackerIntegration';

import {
  assertCanCreateOrganization,
  organizationSlugTakenResponse,
  resolveOrganizationCreateSlug,
} from './organizationsRouteHelpers';

async function resolveCreateOrganizationSlug(
  name: string,
  slugInput: string | undefined
): Promise<NextResponse | string> {
  try {
    return await resolveOrganizationCreateSlug({ name, slugInput });
  } catch (err) {
    if (err instanceof Error && err.message === 'ORG_SLUG_TAKEN') {
      return organizationSlugTakenResponse();
    }
    throw err;
  }
}

export async function createOrganizationForUser(params: {
  name: string;
  slugInput: string | undefined;
  userId: string;
}): Promise<NextResponse> {
  const onPremDenied = await assertCanCreateOrganization();
  if (onPremDenied) {
    return onPremDenied;
  }

  const existingOrgs = await listUserOrganizations(params.userId);
  if (existingOrgs.length > 0) {
    return NextResponse.json(
      { error: 'У вас уже есть организация. Создать вторую нельзя.' },
      { status: 409 }
    );
  }

  const slug = await resolveCreateOrganizationSlug(params.name, params.slugInput);
  if (slug instanceof NextResponse) {
    return slug;
  }

  const settings = mergeOrganizationSettingsTrackerIntegration(
    {},
    buildDefaultTrackerIntegrationStored(0)
  );
  const org = await insertOrganization({ name: params.name, slug, settings });
  await insertOrganizationMember(org.id, params.userId, 'org_admin');
  return NextResponse.json(
    { organization: { id: org.id, name: org.name, slug: org.slug } },
    { status: 201 }
  );
}

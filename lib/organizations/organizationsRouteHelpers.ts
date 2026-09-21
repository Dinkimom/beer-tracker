import { NextResponse } from 'next/server';

import { allocateUniqueOrganizationSlug } from '@/lib/auth/orgSlug';
import { readOnPremSetupState } from '@/lib/onPrem/setupState';
import { findOrganizationBySlug } from '@/lib/organizations';

export async function assertCanCreateOrganization(): Promise<NextResponse | null> {
  const setupState = await readOnPremSetupState();
  if (setupState.hasOrganizations) {
    return NextResponse.json(
      { error: 'On-prem версия поддерживает только одну организацию в системе.' },
      { status: 409 }
    );
  }
  return null;
}

export async function resolveOrganizationCreateSlug(params: {
  name: string;
  slugInput: string | undefined;
}): Promise<string> {
  const slugInput = params.slugInput?.trim();
  if (slugInput) {
    const taken = await findOrganizationBySlug(slugInput);
    if (taken) {
      throw new Error('ORG_SLUG_TAKEN');
    }
    return slugInput;
  }
  return allocateUniqueOrganizationSlug(params.name);
}

export function organizationSlugTakenResponse(): NextResponse {
  return NextResponse.json({ error: 'Такой slug уже занят' }, { status: 409 });
}

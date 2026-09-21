import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  TrackerApiConfigError,
  resolveDefaultOnPremOrganizationId,
} from '@/lib/trackerRequestConfig';

const UuidSchema = z.string().uuid();

export type PlannerTeamCompositionWriteAccessResult =
  | { organizationId: string }
  | { response: NextResponse };

export async function resolveOrganizationIdWhenTenantContextMissing(
  rawOrgHeader: string | null
): Promise<PlannerTeamCompositionWriteAccessResult> {
  const rawOrg = rawOrgHeader?.trim();
  const parsed = rawOrg ? UuidSchema.safeParse(rawOrg) : null;
  const parsedOrgId = parsed?.success ? parsed.data : undefined;

  try {
    const organizationId = parsedOrgId ?? (await resolveDefaultOnPremOrganizationId());
    return { organizationId };
  } catch (error) {
    if (error instanceof TrackerApiConfigError) {
      return { response: NextResponse.json({ error: error.message }, { status: error.status }) };
    }
    throw error;
  }
}

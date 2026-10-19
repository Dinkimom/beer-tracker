import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  requireTenantWithPlannerProfile,
  type RequirePlannerTenantResult,
} from '@/lib/api-tenant';
import {
  isHolidayCountryCode,
  normalizeHolidayCountry,
} from '@/lib/holidays/holidayCountries';
import {
  mergeOrgHolidayCountry,
  readOrgHolidayCountry,
  readOrgHolidayCountryState,
} from '@/lib/holidays/orgHolidayCountry';
import { findOrganizationById, updateOrganization } from '@/lib/organizations';

const HolidayCountryBodySchema = z
  .object({
    holidayCountry: z
      .string()
      .min(2)
      .max(2)
      .refine(isHolidayCountryCode, { message: 'Unknown holiday country' }),
  })
  .strict();

function authOrResponse(
  auth: RequirePlannerTenantResult
): auth is Extract<RequirePlannerTenantResult, { ctx: unknown }> {
  return !('response' in auth);
}

export async function getOrgHolidayCountry(
  request: Request,
  organizationId: string
): Promise<NextResponse> {
  const auth = await requireTenantWithPlannerProfile(request, organizationId);
  if (!authOrResponse(auth)) {
    return auth.response;
  }
  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  return NextResponse.json(readOrgHolidayCountryState(org.settings));
}

export async function patchOrgHolidayCountry(
  request: Request,
  organizationId: string
): Promise<NextResponse> {
  const auth = await requireTenantWithPlannerProfile(request, organizationId);
  if (!authOrResponse(auth)) {
    return auth.response;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = HolidayCountryBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation_failed', issues: parsed.error.issues }, { status: 400 });
  }
  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  const holidayCountry = normalizeHolidayCountry(parsed.data.holidayCountry);
  const current = readOrgHolidayCountry(org.settings);
  if (current === holidayCountry) {
    return NextResponse.json({ holidayCountry });
  }
  await updateOrganization(org.id, {
    settings: mergeOrgHolidayCountry(org.settings, holidayCountry),
  });
  return NextResponse.json({ holidayCountry });
}

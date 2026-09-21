import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireTeamManagementAccess, requireTenantWithAdminProfile } from '@/lib/api-tenant';
import { REGISTRY_UUID_STRING_RE } from '@/lib/registryUuidString';

const UuidSchema = z.string().uuid();

const StaffIdSchema = z
  .string()
  .regex(REGISTRY_UUID_STRING_RE, { message: 'Некорректный идентификатор сотрудника' });

export function parseTeamRouteIds(teamIdRaw: string, staffIdRaw?: string) {
  const teamIdParsed = UuidSchema.safeParse(teamIdRaw);
  if (!teamIdParsed.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор команды' }, { status: 400 });
  }
  if (staffIdRaw == null) {
    return { teamId: teamIdParsed.data };
  }
  const staffIdParsed = StaffIdSchema.safeParse(staffIdRaw);
  if (!staffIdParsed.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор сотрудника' }, { status: 400 });
  }
  return { teamId: teamIdParsed.data, staffId: staffIdParsed.data };
}

export async function requireTeamManagementForRoute(
  request: Request,
  organizationId: string,
  teamId: string
) {
  const auth = await requireTenantWithAdminProfile(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }
  const denied = requireTeamManagementAccess(auth.profile, teamId);
  if (denied) {
    return denied;
  }
  return auth;
}

import type { StaffRow } from '@/lib/staffTeams/types';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

import { adminOrgApiPath } from './paths';

interface AdminStaffWritePayload {
  avatar_url?: string | null;
  display_name: string;
  email: string | null;
  team_ids?: string[];
  tracker_user_id: string | null;
}

export async function createAdminStaff(
  orgId: string,
  payload: AdminStaffWritePayload
): Promise<StaffRow> {
  const { data } = await getPlannerBeerTrackerApi().post<{ staff: StaffRow }>(
    adminOrgApiPath(orgId, 'staff'),
    payload
  );
  return data.staff;
}

export async function patchAdminStaff(
  orgId: string,
  staffId: string,
  payload: Partial<AdminStaffWritePayload>
): Promise<StaffRow> {
  const { data } = await getPlannerBeerTrackerApi().patch<{ staff: StaffRow }>(
    `${adminOrgApiPath(orgId, 'staff')}/${staffId}`,
    payload
  );
  return data.staff;
}

export async function deleteAdminStaff(orgId: string, staffId: string): Promise<void> {
  await getPlannerBeerTrackerApi().delete(`${adminOrgApiPath(orgId, 'staff')}/${staffId}`);
}

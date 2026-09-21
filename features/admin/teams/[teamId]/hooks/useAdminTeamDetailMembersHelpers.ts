import type { AdminTeamMember } from "@/features/admin/adminTeamCatalog";
import type { Dispatch, SetStateAction } from "react";

import {
  fetchAdminTeamMembers,
  postAdminTeamMember,
} from "@/lib/api/admin/teams";

export async function refreshTeamMembers(
  orgId: string,
  teamId: string,
  setMembers: Dispatch<SetStateAction<AdminTeamMember[]>>
): Promise<void> {
  try {
    const members = await fetchAdminTeamMembers(orgId, teamId);
    setMembers(members);
  } catch {
    /* ignore */
  }
}

export async function postRegistryTeamMember(params: {
  addRoleSlug: string;
  addStaffUid: string;
  orgId: string;
  teamId: string;
}): Promise<{ error?: string; ok: boolean }> {
  try {
    await postAdminTeamMember(params.orgId, params.teamId, {
      role_slug: params.addRoleSlug.trim() || null,
      staff_uid: params.addStaffUid,
    });
    return { ok: true };
  } catch (error) {
    const ax = error as { response?: { data?: { error?: string } } };
    return { ok: false, error: ax.response?.data?.error };
  }
}

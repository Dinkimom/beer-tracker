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

export async function postTrackerTeamMember(params: {
  addRoleSlug: string;
  displayName?: string;
  email?: string | null;
  orgId: string;
  teamId: string;
  trackerUserId: string;
}): Promise<{ error?: string; ok: boolean }> {
  try {
    const body: Record<string, unknown> = {
      role_slug: params.addRoleSlug.trim() || null,
      tracker_user_id: params.trackerUserId.trim(),
    };
    const displayName = params.displayName?.trim();
    if (displayName) {
      body.display_name = displayName;
    }
    const email = params.email?.trim();
    if (email) {
      body.email = email;
    }
    await postAdminTeamMember(params.orgId, params.teamId, body);
    return { ok: true };
  } catch (error) {
    const ax = error as { response?: { data?: { error?: string } } };
    return { ok: false, error: ax.response?.data?.error };
  }
}

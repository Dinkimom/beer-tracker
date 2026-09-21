import type { AdminTeamMember } from "@/features/admin/adminTeamCatalog";
import type { Dispatch, SetStateAction } from "react";

import toast from "react-hot-toast";

import {
  postRegistryTeamMember,
  refreshTeamMembers,
} from "./useAdminTeamDetailMembersHelpers";

type Translate = (key: string) => string;

export async function addRegistryTeamMemberFlow(params: {
  addRoleSlug: string;
  addStaffUid: string;
  orgId: string;
  setAddRoleSlug: Dispatch<SetStateAction<string>>;
  setAddStaffMeta: Dispatch<
    SetStateAction<{ displayName?: string; email?: string | null } | null>
  >;
  setAddStaffUid: Dispatch<SetStateAction<string>>;
  setMembers: Dispatch<SetStateAction<AdminTeamMember[]>>;
  t: Translate;
  teamId: string;
}): Promise<boolean> {
  if (!params.addStaffUid.trim()) return false;

  const result = await postRegistryTeamMember({
    addRoleSlug: params.addRoleSlug,
    addStaffUid: params.addStaffUid,
    orgId: params.orgId,
    teamId: params.teamId,
  });
  if (!result.ok) {
    toast.error(result.error ?? params.t("admin.teamDetail.genericError"));
    return false;
  }
  toast.success(params.t("admin.teamDetail.userAddedToTeam"));
  params.setAddStaffUid("");
  params.setAddStaffMeta(null);
  params.setAddRoleSlug("");
  await refreshTeamMembers(params.orgId, params.teamId, params.setMembers);
  return true;
}

import type { AdminTeamMember } from "@/features/admin/adminTeamCatalog";
import type { Dispatch, SetStateAction } from "react";

import toast from "react-hot-toast";

import {
  postRegistryTeamMember,
  postTrackerTeamMember,
  refreshTeamMembers,
} from "./useAdminTeamDetailMembersHelpers";

type Translate = (key: string) => string;

type StaffMetaSetter = Dispatch<
  SetStateAction<{ displayName?: string; email?: string | null } | null>
>;

async function resetAddFormAfterSuccess(params: {
  setAddRoleSlug: Dispatch<SetStateAction<string>>;
  setAddStaffMeta: StaffMetaSetter;
  setAddStaffUid: Dispatch<SetStateAction<string>>;
  setAddTrackerMeta: StaffMetaSetter;
  setAddTrackerUserId: Dispatch<SetStateAction<string>>;
  setMembers: Dispatch<SetStateAction<AdminTeamMember[]>>;
  orgId: string;
  teamId: string;
}): Promise<void> {
  params.setAddStaffUid("");
  params.setAddStaffMeta(null);
  params.setAddTrackerUserId("");
  params.setAddTrackerMeta(null);
  params.setAddRoleSlug("");
  await refreshTeamMembers(params.orgId, params.teamId, params.setMembers);
}

export async function addRegistryTeamMemberFlow(params: {
  addRoleSlug: string;
  addStaffUid: string;
  orgId: string;
  setAddRoleSlug: Dispatch<SetStateAction<string>>;
  setAddStaffMeta: StaffMetaSetter;
  setAddStaffUid: Dispatch<SetStateAction<string>>;
  setAddTrackerMeta: StaffMetaSetter;
  setAddTrackerUserId: Dispatch<SetStateAction<string>>;
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
  await resetAddFormAfterSuccess(params);
  return true;
}

export async function addTrackerTeamMemberFlow(params: {
  addRoleSlug: string;
  addTrackerMeta: { displayName?: string; email?: string | null } | null;
  addTrackerUserId: string;
  orgId: string;
  setAddRoleSlug: Dispatch<SetStateAction<string>>;
  setAddStaffMeta: StaffMetaSetter;
  setAddStaffUid: Dispatch<SetStateAction<string>>;
  setAddTrackerMeta: StaffMetaSetter;
  setAddTrackerUserId: Dispatch<SetStateAction<string>>;
  setMembers: Dispatch<SetStateAction<AdminTeamMember[]>>;
  t: Translate;
  teamId: string;
}): Promise<boolean> {
  if (!params.addTrackerUserId.trim()) return false;

  const result = await postTrackerTeamMember({
    addRoleSlug: params.addRoleSlug,
    displayName: params.addTrackerMeta?.displayName,
    email: params.addTrackerMeta?.email,
    orgId: params.orgId,
    teamId: params.teamId,
    trackerUserId: params.addTrackerUserId,
  });
  if (!result.ok) {
    toast.error(result.error ?? params.t("admin.teamDetail.genericError"));
    return false;
  }
  toast.success(params.t("admin.teamDetail.userCreatedAndAddedToTeam"));
  await resetAddFormAfterSuccess(params);
  return true;
}

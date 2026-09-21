import type { AdminTeamMember } from "@/features/admin/adminTeamCatalog";
import type { Dispatch, SetStateAction } from "react";

import toast from "react-hot-toast";

import { fetchAdminTeamMembers, postAdminTeamMember } from "@/lib/api/admin/teams";
import { readApiErrorMessage } from "@/lib/api/readApiError";
import { catalogRoleSlugForPlannerTeamRole } from "@/lib/organizations/invitedTeamRoleFromCatalogSlug";

type Translate = (key: string) => string;

export async function inviteOnPremTeamMember(args: {
  email: string;
  invitedTeamRole: "team_lead" | "team_member";
  orgId: string;
  setMembers: Dispatch<SetStateAction<AdminTeamMember[]>>;
  t: Translate;
  teamId: string;
  trackerContext?: { display_name: string; tracker_user_id: string } | null;
}): Promise<void> {
  const tid = args.trackerContext?.tracker_user_id?.trim();
  if (!tid) {
    toast.error(args.t("admin.teamDetail.noTrackerIdForDirectAdd"));
    return;
  }

  const body: Record<string, unknown> = {
    display_name: args.trackerContext?.display_name?.trim() || undefined,
    email: args.email,
    role_slug: catalogRoleSlugForPlannerTeamRole(args.invitedTeamRole),
    tracker_user_id: tid,
  };
  try {
    await postAdminTeamMember(args.orgId, args.teamId, body);
    toast.success(args.t("admin.teamDetail.userAddedToTeam"));
    const members = await fetchAdminTeamMembers(args.orgId, args.teamId);
    args.setMembers(members);
  } catch (error) {
    toast.error(readApiErrorMessage(error, args.t("admin.teamDetail.inviteSendFailed")));
  }
}

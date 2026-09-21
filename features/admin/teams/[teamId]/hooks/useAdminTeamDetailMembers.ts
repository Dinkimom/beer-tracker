import type { ConfirmDialogPromptOptions } from "@/components/ConfirmDialog";
import type { AdminTeamMember } from "@/features/admin/adminTeamCatalog";
import type { Dispatch, SetStateAction } from "react";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";

import { useI18n } from "@/contexts/LanguageContext";
import {
  deleteAdminTeamMember,
  patchAdminTeamMember,
} from "@/lib/api/admin/teams";
import { readApiErrorMessage } from "@/lib/api/readApiError";

import { addRegistryTeamMemberFlow } from "./useAdminTeamDetailMembersAddHelpers";
import { inviteOnPremTeamMember } from "./useAdminTeamDetailMembersInviteHelpers";

interface UseAdminTeamDetailMembersParams {
  addRoleSlug: string;
  addStaffUid: string;
  members: AdminTeamMember[];
  orgId: string;
  setAddRoleSlug: Dispatch<SetStateAction<string>>;
  setAddStaffMeta: Dispatch<
    SetStateAction<{
      displayName?: string;
      email?: string | null;
    } | null>
  >;
  setAddStaffUid: Dispatch<SetStateAction<string>>;
  setMembers: Dispatch<SetStateAction<AdminTeamMember[]>>;
  teamId: string;
  confirmDestructive: (message: string, options?: ConfirmDialogPromptOptions) => Promise<boolean>;
}

export function useAdminTeamDetailMembers({
  addRoleSlug,
  addStaffUid,
  confirmDestructive,
  members,
  orgId,
  setAddRoleSlug,
  setAddStaffMeta,
  setAddStaffUid,
  setMembers,
  teamId,
}: UseAdminTeamDetailMembersParams) {
  const { t } = useI18n();

  const [addLoading, setAddLoading] = useState(false);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [inviteBusyStaffId, setInviteBusyStaffId] = useState<string | null>(null);

  const addMember = useCallback(async (): Promise<boolean> => {
    setAddLoading(true);
    try {
      return await addRegistryTeamMemberFlow({
        addRoleSlug,
        addStaffUid,
        orgId,
        setAddRoleSlug,
        setAddStaffMeta,
        setAddStaffUid,
        setMembers,
        t,
        teamId,
      });
    } catch {
      toast.error(t("admin.common.networkError"));
      return false;
    } finally {
      setAddLoading(false);
    }
  }, [
    addRoleSlug,
    addStaffUid,
    orgId,
    setAddRoleSlug,
    setAddStaffMeta,
    setAddStaffUid,
    setMembers,
    t,
    teamId,
  ]);

  const inviteMember = useCallback(
    async (
      staffId: string,
      email: string,
      invitedTeamRole: "team_lead" | "team_member",
      trackerContext?: { display_name: string; tracker_user_id: string } | null,
    ) => {
      const trimmed = email.trim();
      if (!trimmed) {
        toast.error(t("admin.teamDetail.noEmailCannotInvite"));
        return;
      }
      setInviteBusyStaffId(staffId);
      try {
        await inviteOnPremTeamMember({
          email: trimmed,
          invitedTeamRole,
          orgId,
          setMembers,
          t,
          teamId,
          trackerContext,
        });
      } catch {
        toast.error(t("admin.common.networkError"));
      } finally {
        setInviteBusyStaffId(null);
      }
    },
    [orgId, setMembers, t, teamId],
  );

  const removeMember = useCallback(
    async (staffId: string) => {
      const member = members.find((m) => m.staff_id === staffId);
      const label =
        member?.staff_display_name?.trim() || t("admin.teamDetail.removeMemberFallback");
      const confirmed = await confirmDestructive(t("admin.teamDetail.removeMemberConfirm", { label }), {
        confirmText: t("admin.teamDetail.removeMemberConfirmBtn"),
        title: t("admin.teamDetail.removeMemberTitle"),
        variant: "destructive",
      });
      if (!confirmed) return;
      setMemberBusyId(staffId);
      try {
        await deleteAdminTeamMember(orgId, teamId, staffId);
        setMembers((prev) => prev.filter((m) => m.staff_id !== staffId));
        toast.success(t("admin.teamDetail.memberRemoved"));
      } catch (error) {
        toast.error(readApiErrorMessage(error, t("admin.teamDetail.removeMemberFailed")));
      } finally {
        setMemberBusyId(null);
      }
    },
    [confirmDestructive, members, orgId, setMembers, t, teamId],
  );

  const updateMemberRole = useCallback(
    async (staffId: string, roleSlug: string | null) => {
      setMemberBusyId(staffId);
      const prev = members.find((m) => m.staff_id === staffId)?.role_slug ?? null;
      setMembers((ms) =>
        ms.map((m) => (m.staff_id === staffId ? { ...m, role_slug: roleSlug } : m)),
      );
      try {
        await patchAdminTeamMember(orgId, teamId, staffId, { role_slug: roleSlug });
      } catch (error) {
        setMembers((ms) =>
          ms.map((m) => (m.staff_id === staffId ? { ...m, role_slug: prev } : m)),
        );
        toast.error(readApiErrorMessage(error, t("admin.teamDetail.saveRoleError")));
      } finally {
        setMemberBusyId(null);
      }
    },
    [members, orgId, setMembers, t, teamId],
  );

  return {
    addLoading,
    addMember,
    inviteBusyStaffId,
    inviteMember,
    memberBusyId,
    removeMember,
    updateMemberRole,
  };
}

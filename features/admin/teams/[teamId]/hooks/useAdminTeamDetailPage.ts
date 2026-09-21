import type { ConfirmDialogPromptOptions } from "@/components/ConfirmDialog";
import type { CustomSelectOption } from "@/components/CustomSelect";
import type { AdminTeamMember } from "@/features/admin/adminTeamCatalog";
import type { FormEvent } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useI18n } from "@/contexts/LanguageContext";
import {
  teamTitleUsingBoard,
  teamTitleUsingQueue,
  type AdminTrackerCatalogPayload,
  type AdminTeamRow,
} from "@/features/admin/adminTeamCatalog";
import { useEnsureTrackerCatalogBoard } from "@/features/admin/teams/hooks/useEnsureTrackerCatalogBoard";
import { invalidateBoardsQuery } from "@/features/board/boardsQuery";
import { patchAdminTeam } from "@/lib/api/admin/teams";
import { readApiErrorMessage } from "@/lib/api/readApiError";

import { useAdminTeamDetailMembers } from "./useAdminTeamDetailMembers";
import { runLoadTeamDetailCatalog } from "./useAdminTeamDetailPageHelpers";

interface UseAdminTeamDetailPageParams {
  initialMembers: AdminTeamMember[];
  initialTeam: AdminTeamRow;
  isOrgAdmin: boolean;
  orgId: string;
  confirmDestructive: (message: string, options?: ConfirmDialogPromptOptions) => Promise<boolean>;
}

export function useAdminTeamDetailPage({
  confirmDestructive,
  initialMembers,
  initialTeam,
  isOrgAdmin,
  orgId,
}: UseAdminTeamDetailPageParams) {
  const { language, t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [editTitle, setEditTitle] = useState(initialTeam.title);
  const [editQueue, setEditQueue] = useState(initialTeam.tracker_queue_key);
  const [editBoard, setEditBoard] = useState(String(initialTeam.tracker_board_id));
  const [editSaving, setEditSaving] = useState(false);

  const [members, setMembers] = useState<AdminTeamMember[]>(initialMembers);
  const [addStaffUid, setAddStaffUid] = useState("");
  const [addStaffMeta, setAddStaffMeta] = useState<{
    displayName?: string;
    email?: string | null;
  } | null>(null);
  const [addRoleSlug, setAddRoleSlug] = useState("");

  const [catalog, setCatalog] = useState<AdminTrackerCatalogPayload | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const { boardSearchLoading, onBoardSearchQueryChange } = useEnsureTrackerCatalogBoard({
    boards: catalog?.boards ?? [],
    enabled: Boolean(isOrgAdmin && orgId),
    orgId,
    onCatalog: setCatalog,
  });

  const [roleOptions, setRoleOptions] = useState<CustomSelectOption<string>[]>([{ label: "", value: "" }]);

  useEffect(() => {
    setRoleOptions((prev) => {
      const rest = prev.length > 0 ? prev.slice(1) : [];
      return [{ label: t("admin.teamDetail.noRole"), value: "" }, ...rest];
    });
  }, [language, t]);

  const loadCatalog = useCallback(async () => {
    await runLoadTeamDetailCatalog({
      catalog,
      isOrgAdmin,
      orgId,
      setCatalog,
      setCatalogLoading,
      setRoleOptions,
      t,
    });
  }, [catalog, isOrgAdmin, orgId, t]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!isOrgAdmin && addRoleSlug.toLowerCase() === "teamlead") {
      setAddRoleSlug("");
    }
  }, [addRoleSlug, isOrgAdmin]);

  const queueOptions = useMemo((): CustomSelectOption<string>[] => {
    const bindings = catalog?.teams ?? [];
    const head: CustomSelectOption<string>[] = [{ label: t("admin.teamsPage.selectQueue"), value: "" }];
    if (!catalog?.queues.length) return head;
    return [
      ...head,
      ...catalog.queues.map((q) => {
        const owner = teamTitleUsingQueue(bindings, q.key);
        const sharedByOther = owner != null && owner !== initialTeam.title;
        return {
          label: sharedByOther
            ? t("admin.teamsPage.queueAlsoUsedBy", { name: q.name, key: q.key, owner })
            : t("admin.teamsPage.queueFree", { name: q.name, key: q.key }),
          value: q.key,
        };
      }),
    ];
  }, [catalog, initialTeam.title, t]);

  const addRoleOptions = useMemo((): CustomSelectOption<string>[] => {
    if (isOrgAdmin) return roleOptions;
    return roleOptions.filter(
      (o) => o.value === "" || String(o.value).toLowerCase() !== "teamlead",
    );
  }, [isOrgAdmin, roleOptions]);

  const boardOptions = useMemo((): CustomSelectOption<string>[] => {
    const bindings = catalog?.teams ?? [];
    const head: CustomSelectOption<string>[] = [{ label: t("admin.teamsPage.selectBoard"), value: "" }];
    if (!catalog?.boards.length) return head;
    const sorted = [...catalog.boards].sort((a, b) =>
      a.name.localeCompare(b.name, language, { sensitivity: "base" }),
    );
    return [
      ...head,
      ...sorted.map((b) => {
        const owner = teamTitleUsingBoard(bindings, b.id);
        const taken = owner != null && owner !== initialTeam.title;
        const idStr = String(b.id);
        return {
          disabled: taken,
          label: taken
            ? t("admin.teamsPage.boardTaken", { name: b.name, id: idStr, owner })
            : t("admin.teamsPage.boardFree", { name: b.name, id: idStr }),
          value: idStr,
        };
      }),
    ];
  }, [catalog, initialTeam.title, language, t]);

  const saveTeam = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setEditSaving(true);
      try {
        const body = isOrgAdmin
          ? {
              title: editTitle,
              tracker_board_id: editBoard,
              tracker_queue_key: editQueue,
            }
          : { title: editTitle };
        await patchAdminTeam(orgId, initialTeam.id, body);
        toast.success(t("admin.teamDetail.saved"));
        await invalidateBoardsQuery(queryClient);
        router.refresh();
      } catch (error) {
        toast.error(readApiErrorMessage(error, t("admin.teamDetail.saveFailed")));
      } finally {
        setEditSaving(false);
      }
    },
    [editBoard, editQueue, editTitle, initialTeam.id, isOrgAdmin, orgId, queryClient, router, t],
  );

  const {
    addLoading,
    addMember,
    inviteBusyStaffId,
    inviteMember,
    memberBusyId,
    removeMember,
    updateMemberRole,
  } = useAdminTeamDetailMembers({
    addRoleSlug,
    addStaffUid,
    confirmDestructive,
    members,
    orgId,
    setAddRoleSlug,
    setAddStaffMeta,
    setAddStaffUid,
    setMembers,
    teamId: initialTeam.id,
  });

  const backHref = "/admin/teams";
  const addCanAddMember = Boolean(addStaffUid.trim());

  return {
    addCanAddMember,
    addLoading,
    addMember,
    addRoleOptions,
    addRoleSlug,
    addStaffMeta,
    addStaffUid,
    backHref,
    boardOptions,
    boardSearchLoading,
    catalogLoading,
    editBoard,
    editQueue,
    editSaving,
    editTitle,
    initialTeam,
    inviteBusyStaffId,
    inviteMember,
    memberBusyId,
    members,
    onBoardSearchQueryChange,
    orgId,
    queueOptions,
    removeMember,
    roleOptions,
    saveTeam,
    setAddRoleSlug,
    setAddStaffMeta,
    setAddStaffUid,
    setEditBoard,
    setEditQueue,
    setEditTitle,
    updateMemberRole,
  };
}

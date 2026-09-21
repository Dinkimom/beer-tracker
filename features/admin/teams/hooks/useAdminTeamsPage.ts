import type { ConfirmDialogPromptOptions } from "@/components/ConfirmDialog";
import type { CustomSelectOption } from "@/components/CustomSelect";
import type { AdminTeamRow, AdminTrackerCatalogPayload } from "@/features/admin/adminTeamCatalog";
import type { FormEvent } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useI18n } from "@/contexts/LanguageContext";
import {
  teamTitleUsingBoard,
  teamTitleUsingQueue,
} from "@/features/admin/adminTeamCatalog";
import { invalidateBoardsQuery } from "@/features/board/boardsQuery";
import {
  createAdminTeam,
  deleteAdminTeam,
  fetchAdminTeams,
  fetchAdminTrackerCatalog,
  patchAdminTeam,
} from "@/lib/api/admin/teams";
import { readApiErrorMessage } from "@/lib/api/readApiError";

import { parseTrackerCatalogPayload, validateNewTeamForm } from "./useAdminTeamsPageHelpers";
import { useEnsureTrackerCatalogBoard } from "./useEnsureTrackerCatalogBoard";

interface UseAdminTeamsPageParams {
  initialTeams: AdminTeamRow[];
  isOrgAdmin: boolean;
  orgId: string;
  confirmDestructive: (message: string, options?: ConfirmDialogPromptOptions) => Promise<boolean>;
}

export function useAdminTeamsPage({
  confirmDestructive,
  initialTeams,
  isOrgAdmin,
  orgId,
}: UseAdminTeamsPageParams) {
  const { language, t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [teamsList, setTeamsList] = useState(initialTeams);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [trackerCatalog, setTrackerCatalog] = useState<AdminTrackerCatalogPayload | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [newTeamTitle, setNewTeamTitle] = useState("");
  const [selectTeamQueue, setSelectTeamQueue] = useState("");
  const [selectTeamBoard, setSelectTeamBoard] = useState("");
  const [teamFormSubmitting, setTeamFormSubmitting] = useState(false);
  const [teamBusyId, setTeamBusyId] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    if (!orgId) return;
    setTeamsLoading(true);
    try {
      const teams = await fetchAdminTeams(orgId);
      setTeamsList(teams);
    } catch (error) {
      toast.error(readApiErrorMessage(error, t("admin.teamsPage.loadTeamsFailed")));
      setTeamsList([]);
    } finally {
      setTeamsLoading(false);
    }
  }, [orgId, t]);

  const loadTrackerCatalog = useCallback(async () => {
    if (!orgId) return;
    setCatalogLoading(true);
    try {
      const data = await fetchAdminTrackerCatalog(orgId);
      setTrackerCatalog(parseTrackerCatalogPayload(data));
    } catch (error) {
      setTrackerCatalog(null);
      toast.error(readApiErrorMessage(error, t("admin.teamsPage.catalogLoadFailed")));
    } finally {
      setCatalogLoading(false);
    }
  }, [orgId, t]);

  const { boardSearchLoading, onBoardSearchQueryChange } = useEnsureTrackerCatalogBoard({
    boards: trackerCatalog?.boards ?? [],
    enabled: Boolean(isOrgAdmin && orgId),
    orgId,
    onCatalog: setTrackerCatalog,
  });

  useEffect(() => {
    if (!isOrgAdmin) return;
    void loadTrackerCatalog();
  }, [isOrgAdmin, loadTrackerCatalog]);

  useEffect(() => {
    if (!trackerCatalog) return;
    const bindings = trackerCatalog.teams;
    setSelectTeamBoard((b) => {
      if (!b.trim()) return b;
      const n = Number.parseInt(b, 10);
      return teamTitleUsingBoard(bindings, n) ? "" : b;
    });
  }, [trackerCatalog]);

  const queueSelectOptions = useMemo((): CustomSelectOption<string>[] => {
    const bindings = trackerCatalog?.teams ?? [];
    const head: CustomSelectOption<string>[] = [{ label: t("admin.teamsPage.selectQueue"), value: "" }];
    if (!trackerCatalog?.queues.length) return head;
    return [
      ...head,
      ...trackerCatalog.queues.map((q) => {
        const owner = teamTitleUsingQueue(bindings, q.key);
        return {
          label: owner
            ? t("admin.teamsPage.queueAlsoUsedBy", { name: q.name, key: q.key, owner })
            : t("admin.teamsPage.queueFree", { name: q.name, key: q.key }),
          value: q.key,
        };
      }),
    ];
  }, [trackerCatalog, t]);

  const boardNameById = useMemo(() => {
    const m = new Map<number, string>();
    const boards = trackerCatalog?.boards;
    if (!boards?.length) return m;
    for (const b of boards) {
      m.set(b.id, b.name);
    }
    return m;
  }, [trackerCatalog]);

  const boardSelectOptions = useMemo((): CustomSelectOption<string>[] => {
    const bindings = trackerCatalog?.teams ?? [];
    const head: CustomSelectOption<string>[] = [{ label: t("admin.teamsPage.selectBoard"), value: "" }];
    if (!trackerCatalog?.boards.length) return head;
    const sorted = [...trackerCatalog.boards].sort((a, b) =>
      a.name.localeCompare(b.name, language, { sensitivity: "base" }),
    );
    return [
      ...head,
      ...sorted.map((b) => {
        const owner = teamTitleUsingBoard(bindings, b.id);
        const taken = owner != null;
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
  }, [language, trackerCatalog, t]);

  const submitNewTeam = useCallback(
    async (e: FormEvent): Promise<boolean> => {
      e.preventDefault();
      if (!orgId) return false;
      const validation = validateNewTeamForm(
        {
          boardRaw: selectTeamBoard.trim(),
          bindings: trackerCatalog?.teams ?? [],
          queue: selectTeamQueue.trim(),
          title: newTeamTitle.trim(),
        },
        t,
      );
      if (!validation.ok) {
        toast.error(validation.error);
        return false;
      }
      const { title, queue, boardNum } = validation.value;
      setTeamFormSubmitting(true);
      try {
        await createAdminTeam(orgId, {
          title,
          tracker_board_id: boardNum,
          tracker_queue_key: queue,
        });
        toast.success(t("admin.teamsPage.createSuccess"));
        setNewTeamTitle("");
        setSelectTeamQueue("");
        setSelectTeamBoard("");
        await loadTeams();
        await loadTrackerCatalog();
        await invalidateBoardsQuery(queryClient);
        router.refresh();
        return true;
      } catch (error) {
        toast.error(readApiErrorMessage(error, t("admin.teamsPage.createFailed")));
        return false;
      } finally {
        setTeamFormSubmitting(false);
      }
    },
    [
      loadTeams,
      loadTrackerCatalog,
      newTeamTitle,
      orgId,
      queryClient,
      router,
      selectTeamBoard,
      selectTeamQueue,
      t,
      trackerCatalog,
    ],
  );

  const setTeamActive = useCallback(
    async (teamId: string, active: boolean) => {
      if (!orgId) return;
      setTeamBusyId(teamId);
      try {
        await patchAdminTeam(orgId, teamId, { active });
        toast.success(active ? t("admin.teamsPage.teamEnabled") : t("admin.teamsPage.teamDisabled"));
        await loadTeams();
        await invalidateBoardsQuery(queryClient);
        router.refresh();
      } catch (error) {
        toast.error(readApiErrorMessage(error, t("admin.teamsPage.updateFailed")));
      } finally {
        setTeamBusyId(null);
      }
    },
    [loadTeams, orgId, queryClient, router, t],
  );

  const removeTeam = useCallback(
    async (teamId: string) => {
      if (!orgId) return;
      const confirmed = await confirmDestructive(t("admin.teamsPage.deleteTeamBody"), {
        confirmText: t("admin.teamsPage.deleteTeamConfirm"),
        title: t("admin.teamsPage.deleteTeamTitle"),
        variant: "destructive",
      });
      if (!confirmed) return;
      setTeamBusyId(teamId);
      try {
        await deleteAdminTeam(orgId, teamId);
        toast.success(t("admin.teamsPage.deleteSuccess"));
        await loadTeams();
        await loadTrackerCatalog();
        await invalidateBoardsQuery(queryClient);
        router.refresh();
      } catch (error) {
        toast.error(readApiErrorMessage(error, t("admin.teamsPage.deleteFailed")));
      } finally {
        setTeamBusyId(null);
      }
    },
    [confirmDestructive, loadTeams, loadTrackerCatalog, orgId, queryClient, router, t],
  );

  const teamHref = useCallback((teamId: string) => `/admin/teams/${teamId}`, []);

  return {
    boardNameById,
    boardSearchLoading,
    boardSelectOptions,
    catalogLoading,
    loadTeams,
    newTeamTitle,
    onBoardSearchQueryChange,
    orgId,
    queueSelectOptions,
    removeTeam,
    selectTeamBoard,
    selectTeamQueue,
    setNewTeamTitle,
    setSelectTeamBoard,
    setSelectTeamQueue,
    setTeamActive,
    submitNewTeam,
    teamBusyId,
    teamFormSubmitting,
    teamHref,
    teamsList,
    teamsLoading,
    trackerCatalog,
  };
}

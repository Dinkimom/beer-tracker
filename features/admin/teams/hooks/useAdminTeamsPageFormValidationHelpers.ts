import type { AdminTrackerCatalogTeamBinding } from "@/features/admin/adminTeamCatalog";

import { teamTitleUsingBoard } from "@/features/admin/adminTeamCatalog";

type Translate = (key: string, params?: Record<string, number | string>) => string;

function parsePositiveBoardId(
  boardRaw: string,
  t: Translate,
): { boardNum: number; ok: true } | { error: string; ok: false } {
  const boardNum = Number.parseInt(boardRaw, 10);
  if (!Number.isFinite(boardNum) || boardNum <= 0) {
    return { ok: false, error: t("admin.teamsPage.invalidBoard") };
  }
  return { ok: true, boardNum };
}

/** Boards stay unique per org; queues may be shared across teams. */
function validateTrackerBoardAvailability(
  bindings: AdminTrackerCatalogTeamBinding[],
  boardNum: number,
  t: Translate,
): { error: string; ok: false } | { ok: true } {
  const bOwner = teamTitleUsingBoard(bindings, boardNum);
  if (bOwner) {
    return { ok: false, error: t("admin.teamsPage.boardTakenByTeam", { team: bOwner }) };
  }
  return { ok: true };
}

export function validateNewTeamFormFields(
  input: { boardRaw: string; queue: string; title: string },
  t: Translate,
):
  { error: string; ok: false } | { ok: true; queue: string; title: string } {
  const title = input.title.trim();
  const queue = input.queue.trim();
  const boardRaw = input.boardRaw.trim();
  if (!title) {
    return { ok: false, error: t("admin.teamsPage.titleRequired") };
  }
  if (!queue) {
    return { ok: false, error: t("admin.teamsPage.queueRequired") };
  }
  if (!boardRaw) {
    return { ok: false, error: t("admin.teamsPage.boardRequired") };
  }
  return { ok: true, title, queue };
}

export function validateNewTeamFormBindings(
  bindings: AdminTrackerCatalogTeamBinding[],
  boardRaw: string,
  t: Translate,
):
  | { boardNum: number; ok: true }
  | { error: string; ok: false } {
  const board = parsePositiveBoardId(boardRaw, t);
  if (!board.ok) {
    return board;
  }
  const availability = validateTrackerBoardAvailability(bindings, board.boardNum, t);
  if (!availability.ok) {
    return availability;
  }
  return { ok: true, boardNum: board.boardNum };
}

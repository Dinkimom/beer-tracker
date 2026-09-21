import type { AdminTrackerCatalogPayload } from "@/features/admin/adminTeamCatalog";

import { useCallback, useEffect, useRef, useState } from "react";

import { parsePositiveDecimalId } from "@/lib/admin/parsePositiveDecimalId";
import { fetchAdminTrackerCatalog } from "@/lib/api/admin/teams";

import { parseTrackerCatalogPayload } from "./useAdminTeamsPageHelpers";

const BOARD_ID_LOOKUP_DEBOUNCE_MS = 300;

interface UseEnsureTrackerCatalogBoardParams {
  boards: Array<{ id: number }>;
  enabled: boolean;
  orgId: string;
  onCatalog: (data: AdminTrackerCatalogPayload) => void;
}

export function useEnsureTrackerCatalogBoard({
  boards,
  enabled,
  orgId,
  onCatalog,
}: UseEnsureTrackerCatalogBoardParams) {
  const [boardSearchLoading, setBoardSearchLoading] = useState(false);
  const boardsRef = useRef(boards);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

  const onBoardSearchQueryChange = useCallback(
    (query: string) => {
      if (!enabled || !orgId) return;
      const boardId = parsePositiveDecimalId(query);
      if (boardId == null || boardsRef.current.some((board) => board.id === boardId)) {
        return;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        void lookupBoardInCatalog(orgId, boardId, boardsRef, setBoardSearchLoading, onCatalog);
      }, BOARD_ID_LOOKUP_DEBOUNCE_MS);
    },
    [enabled, onCatalog, orgId],
  );

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return { boardSearchLoading, onBoardSearchQueryChange };
}

async function lookupBoardInCatalog(
  orgId: string,
  boardId: number,
  boardsRef: { current: Array<{ id: number }> },
  setBoardSearchLoading: (loading: boolean) => void,
  onCatalog: (data: AdminTrackerCatalogPayload) => void,
): Promise<void> {
  if (boardsRef.current.some((board) => board.id === boardId)) {
    return;
  }
  setBoardSearchLoading(true);
  try {
    const data = await fetchAdminTrackerCatalog(orgId, { boardId });
    onCatalog(parseTrackerCatalogPayload(data));
  } catch {
    /* board id may be unknown to this token */
  } finally {
    setBoardSearchLoading(false);
  }
}

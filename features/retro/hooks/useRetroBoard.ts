'use client';

import type { RetroSprintOrderItem, RetroStore } from '@/lib/retro/retroBoard';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';

import { fetchRetroColumnTemplate } from '@/lib/api/retroColumnTemplate';
import { saveRetroBoard } from '@/lib/api/sprints';
import {
  type RetroBoard,
  type RetroColumn,
  addRetroCardComment,
  addRetroColumn,
  addRetroNote,
  changedRetroBoards,
  deleteRetroCard,
  deleteRetroCardComment,
  deleteRetroColumn,
  moveRetroCard,
  moveRetroColumn,
  renameRetroColumn,
  resolveAdjacentSprintIds,
  resolveRetroBoard,
  retroStoreFromBoards,
  toggleRetroCardReaction,
  updateRetroCardText,
} from '@/lib/retro/retroBoard';
import { mergeRetroBoards } from '@/lib/retro/retroBoardMerge';

import { loadRetroBoard } from './loadRetroBoard';
import {
  commitRetroBoardSync,
  rememberRetroBoardSync,
  retroBoardSyncBase,
  trackRetroSave,
} from './retroBoardSyncState';

function retroBoardQueryKey(sprintId: number): ['retroBoard', number] {
  return ['retroBoard', sprintId];
}

export function useRetroBoard(
  sprintId: number,
  sprints: readonly RetroSprintOrderItem[],
  organizationId: string | null
) {
  const queryClient = useQueryClient();
  const adjacent = useMemo(
    () => resolveAdjacentSprintIds(sprints, sprintId),
    [sprintId, sprints]
  );
  const previousSprintId = adjacent.previousSprintId;
  const currentQuery = useQuery({
    queryKey: retroBoardQueryKey(sprintId),
    queryFn: () => loadSyncedRetroBoard(sprintId),
  });
  const previousQuery = useQuery({
    enabled: previousSprintId != null,
    queryKey: retroBoardQueryKey(previousSprintId ?? 0),
    queryFn: () => loadSyncedRetroBoard(previousSprintId ?? 0),
  });
  const store = useMemo(
    () => retroStoreFromBoards([currentQuery.data, previousQuery.data]),
    [currentQuery.data, previousQuery.data]
  );
  const needsTemplate = needsRetroColumnTemplate(
    organizationId,
    currentQuery.data,
    currentQuery.isSuccess
  );
  const templateQuery = useQuery({
    enabled: needsTemplate,
    queryFn: () => fetchRetroColumnTemplate(organizationId ?? ''),
    queryKey: ['retroColumnTemplate', organizationId],
  });
  const templateColumns = templateQuery.data;
  const board = useMemo(
    () => resolveRetroBoard(store, sprintId, templateColumns),
    [sprintId, store, templateColumns]
  );
  const saveChain = useRef(new Map<number, Promise<void>>());

  const commit = useCallback(
    (mutate: (current: RetroStore) => RetroStore) => {
      const current = seedMissingRetroBoard(
        cachedRetroStore(queryClient, sprintId, previousSprintId),
        sprintId,
        templateColumns
      );
      const next = mutate(current);
      if (next === current) return;
      for (const changed of changedRetroBoards(current, next)) {
        queryClient.setQueryData(retroBoardQueryKey(changed.sprintId), changed);
        enqueueRetroSave(saveChain.current, queryClient, changed);
      }
    },
    [previousSprintId, queryClient, sprintId, templateColumns]
  );

  const templateReady = !needsTemplate || templateQuery.isFetched;
  const isReady =
    currentQuery.isSuccess && (previousSprintId == null || previousQuery.isSuccess) && templateReady;

  const addColumn = useCallback(
    (title: string) => {
      commit((current) => addRetroColumn(current, sprintId, title));
    },
    [commit, sprintId]
  );
  const renameColumn = useCallback(
    (columnId: string, title: string) => {
      commit((current) => renameRetroColumn(current, sprintId, columnId, title));
    },
    [commit, sprintId]
  );
  const removeColumn = useCallback(
    (columnId: string) => {
      commit((current) => deleteRetroColumn(current, sprintId, columnId));
    },
    [commit, sprintId]
  );
  const moveColumn = useCallback(
    (columnId: string, direction: -1 | 1) => {
      commit((current) => moveRetroColumn(current, sprintId, columnId, direction));
    },
    [commit, sprintId]
  );
  const addNote = useCallback(
    (columnId: string, text: string) => {
      commit((current) => addRetroNote(current, sprintId, columnId, text));
    },
    [commit, sprintId]
  );
  const moveCard = useCallback(
    (cardId: string, columnId: string) => {
      commit((current) => moveRetroCard(current, sprintId, cardId, columnId));
    },
    [commit, sprintId]
  );
  const toggleReaction = useCallback(
    (ownerSprintId: number, cardId: string, emoji: string) => {
      commit((current) => toggleRetroCardReaction(current, ownerSprintId, cardId, emoji));
    },
    [commit]
  );
  const updateCardText = useCallback(
    (ownerSprintId: number, cardId: string, text: string) => {
      commit((current) => updateRetroCardText(current, ownerSprintId, cardId, text));
    },
    [commit]
  );
  const removeCard = useCallback(
    (cardId: string) => {
      commit((current) => deleteRetroCard(current, cardId));
    },
    [commit]
  );
  const addComment = useCallback(
    (ownerSprintId: number, cardId: string, text: string, authorName: string) => {
      commit((current) => addRetroCardComment(current, ownerSprintId, cardId, text, authorName));
    },
    [commit]
  );
  const deleteComment = useCallback(
    (ownerSprintId: number, cardId: string, commentId: string) => {
      commit((current) => deleteRetroCardComment(current, ownerSprintId, cardId, commentId));
    },
    [commit]
  );

  return {
    addColumn,
    addComment,
    addNote,
    board,
    isReady,
    moveCard,
    moveColumn,
    deleteComment,
    previousSprintId,
    removeCard,
    removeColumn,
    renameColumn,
    store,
    toggleReaction,
    updateCardText,
  };
}

function needsRetroColumnTemplate(
  organizationId: string | null,
  current: RetroBoard | null | undefined,
  currentReady: boolean
): boolean {
  return Boolean(organizationId) && currentReady && !current;
}

function seedMissingRetroBoard(
  store: RetroStore,
  sprintId: number,
  templateColumns: readonly RetroColumn[] | undefined
): RetroStore {
  if (store.boards[String(sprintId)]) return store;
  const seeded = resolveRetroBoard(store, sprintId, templateColumns);
  return { version: 1, boards: { ...store.boards, [String(sprintId)]: seeded } };
}

function cachedRetroStore(
  queryClient: ReturnType<typeof useQueryClient>,
  sprintId: number,
  previousSprintId: number | null
): RetroStore {
  const current = queryClient.getQueryData<RetroBoard | null>(retroBoardQueryKey(sprintId));
  const previous = previousSprintId == null
    ? null
    : queryClient.getQueryData<RetroBoard | null>(retroBoardQueryKey(previousSprintId));
  return retroStoreFromBoards([current, previous]);
}

function loadSyncedRetroBoard(sprintId: number): Promise<RetroBoard | null> {
  return loadRetroBoard(sprintId).then((board) => {
    rememberRetroBoardSync(sprintId, board);
    return board;
  });
}

function enqueueRetroSave(
  chains: Map<number, Promise<void>>,
  queryClient: ReturnType<typeof useQueryClient>,
  board: RetroBoard
): void {
  const previous = chains.get(board.sprintId) ?? Promise.resolve();
  const pending = previous.catch(() => undefined).then(() => persistRetroBoard(queryClient, board));
  chains.set(board.sprintId, pending);
}

async function persistRetroBoard(
  queryClient: ReturnType<typeof useQueryClient>,
  board: RetroBoard
): Promise<void> {
  const key = retroBoardQueryKey(board.sprintId);
  trackRetroSave(board.sprintId, 1);
  try {
    const latest = queryClient.getQueryData<RetroBoard | null>(key) ?? board;
    const saved = await saveRetroBoard(latest.sprintId, latest, retroBoardSyncBase(latest.sprintId));
    commitRetroBoardSync(latest.sprintId, saved);
    const after = queryClient.getQueryData<RetroBoard | null>(key);
    const next = !after || after === latest ? saved : mergeRetroBoards(latest, saved, after);
    queryClient.setQueryData(key, next);
  } catch {
    queryClient.invalidateQueries({ queryKey: key }).catch(() => undefined);
  } finally {
    trackRetroSave(board.sprintId, -1);
  }
}

'use client';

import type { ReactNode } from 'react';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import {
  applyBacklogSelectionToggle,
  selectAllBacklogTaskIds,
  withoutBacklogTaskIds,
  type BacklogSelectionAnchor,
} from '../utils/backlogSelection';

interface BacklogSelectionContextValue {
  selectedCount: number;
  selectedIds: ReadonlySet<string>;
  clear: () => void;
  isSelected: (taskId: string) => boolean;
  selectAllVisible: () => void;
  setVisibleTasks: (scopeId: string, taskIds: readonly string[]) => void;
  toggle: (scopeId: string, taskId: string, shiftKey: boolean) => void;
  unselect: (taskIds: readonly string[]) => void;
}

const BacklogSelectionContext = createContext<BacklogSelectionContextValue | null>(null);

export function BacklogSelectionProvider({ children }: { children: ReactNode }) {
  const visibleRef = useRef(new Map<string, readonly string[]>());
  const anchorRef = useRef<BacklogSelectionAnchor | null>(null);
  const selectedRef = useRef<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  const commit = useCallback((next: ReadonlySet<string>) => {
    selectedRef.current = next;
    setSelected(next);
  }, []);

  const setVisibleTasks = useCallback((scopeId: string, taskIds: readonly string[]) => {
    if (taskIds.length === 0) visibleRef.current.delete(scopeId);
    else visibleRef.current.set(scopeId, taskIds);
  }, []);

  const toggle = useCallback(
    (scopeId: string, taskId: string, shiftKey: boolean) => {
      const result = applyBacklogSelectionToggle({
        anchor: anchorRef.current,
        orderedIds: visibleRef.current.get(scopeId) ?? [],
        scopeId,
        selected: selectedRef.current,
        shiftKey,
        taskId,
      });
      anchorRef.current = result.anchor;
      commit(result.selected);
    },
    [commit]
  );

  const selectAllVisible = useCallback(() => {
    commit(selectAllBacklogTaskIds(selectedRef.current, visibleRef.current.values()));
  }, [commit]);

  const clear = useCallback(() => {
    anchorRef.current = null;
    commit(new Set());
  }, [commit]);

  const unselect = useCallback(
    (taskIds: readonly string[]) => {
      commit(withoutBacklogTaskIds(selectedRef.current, taskIds));
    },
    [commit]
  );

  const isSelected = useCallback((taskId: string) => selected.has(taskId), [selected]);

  const value = useMemo<BacklogSelectionContextValue>(
    () => ({
      clear,
      isSelected,
      selectAllVisible,
      selectedCount: selected.size,
      selectedIds: selected,
      setVisibleTasks,
      toggle,
      unselect,
    }),
    [clear, isSelected, selectAllVisible, selected, setVisibleTasks, toggle, unselect]
  );

  return <BacklogSelectionContext.Provider value={value}>{children}</BacklogSelectionContext.Provider>;
}

export function useBacklogSelection(): BacklogSelectionContextValue {
  const value = useContext(BacklogSelectionContext);
  if (!value) {
    throw new Error('useBacklogSelection requires BacklogSelectionProvider');
  }
  return value;
}

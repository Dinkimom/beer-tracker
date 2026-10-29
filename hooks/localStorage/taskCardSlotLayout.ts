import { useCallback, useMemo } from 'react';

import {
  defaultTaskCardSlotLayout,
  layoutFromVisibility,
  normalizeTaskCardSlotLayout,
  taskCardLayoutReservesEyebrow,
  visibilityFromLayout,
  type TaskCardBoard,
  type TaskCardSlotLayout,
} from '@/lib/taskCard/taskCardSlots';

import { useSwimlaneCardFieldsStorage } from './hooksSwimlaneAndKanban';
import { STORAGE_KEYS } from './storageKeys';
import { useLocalStorage } from './useLocalStorageBase';

const SLOT_LAYOUT_STORAGE_KEYS: Record<TaskCardBoard, string> = {
  kanban: STORAGE_KEYS.KANBAN_CARD_SLOT_LAYOUT,
  swimlane: STORAGE_KEYS.SWIMLANE_CARD_SLOT_LAYOUT,
};

function useTaskCardSlotLayoutStorage(board: TaskCardBoard): [
  TaskCardSlotLayout | null,
  (value: TaskCardSlotLayout | null) => void,
] {
  const [stored, setStored] = useLocalStorage<TaskCardSlotLayout | null>(
    SLOT_LAYOUT_STORAGE_KEYS[board],
    null
  );
  const layout = useMemo(
    () => (stored == null ? null : normalizeTaskCardSlotLayout(stored, board)),
    [board, stored]
  );
  const setLayout = (value: TaskCardSlotLayout | null) => {
    setStored(value == null ? null : normalizeTaskCardSlotLayout(value, board));
  };
  return [layout, setLayout];
}

/**
 * Сохранённая раскладка доски, а если её ещё нет — раскладка по умолчанию.
 * У свимлейна по умолчанию — та, что следует из галочек полей.
 */
function useTaskCardSlotLayoutWithFallback(board: TaskCardBoard) {
  const [stored, setStored] = useTaskCardSlotLayoutStorage(board);
  const [fields, setFields] = useSwimlaneCardFieldsStorage();
  const layout = useMemo(() => {
    if (stored) {
      return stored;
    }
    return board === 'swimlane' ? layoutFromVisibility(fields) : defaultTaskCardSlotLayout(board);
  }, [board, fields, stored]);
  return { layout, setFields, setStored };
}

export function useResolvedTaskCardSlotLayout(board: TaskCardBoard = 'swimlane'): TaskCardSlotLayout {
  return useTaskCardSlotLayoutWithFallback(board).layout;
}

/** Раскладка карточки и запись. У свимлейна вместе со слотами обновляется зеркало галочек полей. */
export function useCommitTaskCardSlotLayout(board: TaskCardBoard = 'swimlane'): {
  commit: (layout: TaskCardSlotLayout) => void;
  layout: TaskCardSlotLayout;
} {
  const { layout, setFields, setStored } = useTaskCardSlotLayoutWithFallback(board);
  const commit = useCallback(
    (next: TaskCardSlotLayout) => {
      setStored(next);
      if (board === 'swimlane') {
        setFields(visibilityFromLayout(next));
      }
    },
    [board, setFields, setStored]
  );
  return { commit, layout };
}

export function useSwimlaneCardReservesEyebrow(): boolean {
  const layout = useResolvedTaskCardSlotLayout('swimlane');
  return taskCardLayoutReservesEyebrow(layout);
}

import { useCallback, useMemo } from 'react';

import {
  layoutFromVisibility,
  normalizeTaskCardSlotLayout,
  taskCardLayoutReservesEyebrow,
  visibilityFromLayout,
  type TaskCardSlotLayout,
} from '@/lib/taskCard/taskCardSlots';

import { useSwimlaneCardFieldsStorage } from './hooksOccupancyEpicQuarterly';
import { STORAGE_KEYS } from './storageKeys';
import { useLocalStorage } from './useLocalStorageBase';

function useSwimlaneCardSlotLayoutStorage(): [
  TaskCardSlotLayout | null,
  (value: TaskCardSlotLayout | null) => void,
] {
  const [stored, setStored] = useLocalStorage<TaskCardSlotLayout | null>(
    STORAGE_KEYS.SWIMLANE_CARD_SLOT_LAYOUT,
    null
  );
  const layout = useMemo(() => (stored == null ? null : normalizeTaskCardSlotLayout(stored)), [stored]);
  const setLayout = (value: TaskCardSlotLayout | null) => {
    setStored(value == null ? null : normalizeTaskCardSlotLayout(value));
  };
  return [layout, setLayout];
}

/** Сохранённая раскладка, а если её ещё нет — та, что следует из галочек полей. */
export function useResolvedSwimlaneCardSlotLayout(): TaskCardSlotLayout {
  const [stored] = useSwimlaneCardSlotLayoutStorage();
  const [fields] = useSwimlaneCardFieldsStorage();
  return useMemo(() => stored ?? layoutFromVisibility(fields), [fields, stored]);
}

/** Раскладка карточки и запись: слоты и зеркало галочек полей обновляются вместе. */
export function useCommitSwimlaneCardSlotLayout(): {
  commit: (layout: TaskCardSlotLayout) => void;
  layout: TaskCardSlotLayout;
} {
  const [stored, setStored] = useSwimlaneCardSlotLayoutStorage();
  const [fields, setFields] = useSwimlaneCardFieldsStorage();
  const layout = useMemo(() => stored ?? layoutFromVisibility(fields), [fields, stored]);
  const commit = useCallback(
    (next: TaskCardSlotLayout) => {
      setStored(next);
      setFields(visibilityFromLayout(next));
    },
    [setFields, setStored]
  );
  return { commit, layout };
}

export function useSwimlaneCardReservesEyebrow(): boolean {
  const layout = useResolvedSwimlaneCardSlotLayout();
  return taskCardLayoutReservesEyebrow(layout);
}

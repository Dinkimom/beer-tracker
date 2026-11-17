'use client';

import type { QuarterDetailLevel } from './quarterlyPlanDetail';
import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { Dispatch, SetStateAction } from 'react';

import { useCallback } from 'react';

import { useQuarterDetailLevelStorage } from '@/hooks/useLocalStorage';

import { parseQuarterDetailLevel } from './quarterlyPlanDetail';

/**
 * Уровень детализации доски (QZ1), запоминается в браузере. Переход в «По дням» раскрывает задачи всех эпиков,
 * выход из них — сворачивает: на «Плане» доска снова компактная, а стрелки эпиков работают на обоих уровнях.
 */
export function useQuarterDetail(
  epics: readonly QuarterlyPlanEpic[] | undefined,
  setExpandedEpicIds: Dispatch<SetStateAction<ReadonlySet<string>>>
): { detail: QuarterDetailLevel; setDetail: (level: QuarterDetailLevel) => void } {
  const [stored, setStored] = useQuarterDetailLevelStorage();
  const detail = parseQuarterDetailLevel(stored);
  const setDetail = useCallback(
    (level: QuarterDetailLevel) => {
      setStored(level);
      const parents = (epics ?? []).flatMap((epic) => (epic.parentEpicId ? [epic.parentEpicId] : []));
      setExpandedEpicIds(new Set(level === 'days' ? parents : []));
    },
    [epics, setExpandedEpicIds, setStored]
  );
  return { detail, setDetail };
}

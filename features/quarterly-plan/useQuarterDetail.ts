'use client';

import type { QuarterBoardRows } from './model/quarterBoardRows';
import type { QuarterLinkTool } from './model/quarterLinkTool';
import type { QuarterDetailLevel } from './quarterlyPlanDetail';
import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useCallback } from 'react';

import { useQuarterDetailLevelStorage } from '@/hooks/useLocalStorage';

import { parseQuarterDetailLevel } from './quarterlyPlanDetail';

/**
 * Уровень детализации доски (QZ1), запоминается в браузере. Переход в «Дни» раскрывает задачи всех эпиков,
 * выход из них — сворачивает: на «Неделях» доска снова компактная, а стрелки эпиков работают на обоих уровнях.
 */
export function useQuarterDetail(
  epics: readonly QuarterlyPlanEpic[] | undefined,
  rows: Pick<QuarterBoardRows, 'showDetail'>,
  links: Pick<QuarterLinkTool, 'clearSource'>
): { detail: QuarterDetailLevel; setDetail: (level: QuarterDetailLevel) => void } {
  const [stored, setStored] = useQuarterDetailLevelStorage();
  const detail = parseQuarterDetailLevel(stored);
  const setDetail = useCallback(
    (level: QuarterDetailLevel) => {
      setStored(level);
      rows.showDetail(level, epics ?? []);
      // На уровне «Квартал» полосы сводные, на других — назначения: выбранный источник связи снимается.
      if ((level === 'quarter') !== (detail === 'quarter')) links.clearSource();
    },
    [detail, epics, links, rows, setStored]
  );
  return { detail, setDetail };
}

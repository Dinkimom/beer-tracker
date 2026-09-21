import type { TaskPosition } from '@/types';

import { useCallback } from 'react';

import {
  fromWeekColumnPosition,
  toWeekColumnPosition,
} from '../utils/quarterlyWeekPositions';

/** Преобразование глобальной позиции (рабочие дни квартала) ↔ индексы недельных колонок. */
export function useQuarterlyWeekPositions() {
  const toWeekPosition = useCallback(
    (pos: TaskPosition): TaskPosition => toWeekColumnPosition(pos),
    []
  );

  const fromWeekPosition = useCallback(
    (pos: TaskPosition): TaskPosition => fromWeekColumnPosition(pos),
    []
  );

  return { fromWeekPosition, toWeekPosition };
}

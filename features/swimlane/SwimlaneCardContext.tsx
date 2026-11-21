'use client';

import type { SegmentPlanAnchorOverlay } from '@/features/swimlane/utils/planAnchorShift';
import type { PhaseSegment, Task, TaskPosition } from '@/types';

import { createContext, useContext } from 'react';

import { getPartsPerDay } from '@/constants';
import { resolveSegmentPlanAnchorOverlay } from '@/features/swimlane/utils/planAnchorShift';
import { useRootStore } from '@/lib/layers';

/**
 * Какая это карточка дорожки: задача, её позиция и отрезок (в редакторе отрезков — черновик).
 * Задаёт сегмент один раз; листья карточки читают отсюда и из моделей сами, а не пропсами через
 * `TaskBar` и его слои. У призрака предложения агента контекста нет.
 */
interface SwimlaneCard {
  position: TaskPosition;
  segment: PhaseSegment;
  task: Task;
}

export const SwimlaneCardContext = createContext<SwimlaneCard | null>(null);

/** Якорь плана на старте работы для этой карточки. Читатель — `observer` (якоря в сторе позиций). */
export function useSwimlaneCardPlanAnchor(): SegmentPlanAnchorOverlay | null {
  const card = useContext(SwimlaneCardContext);
  const { taskPositions } = useRootStore();
  if (!card) return null;
  return resolveSegmentPlanAnchorOverlay({
    anchor: taskPositions.planAnchors.get(card.task.id),
    partsPerDay: getPartsPerDay(),
    position: card.position,
    segment: card.segment,
    task: card.task,
  });
}

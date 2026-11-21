import { useContext } from 'react';

import { getPartsPerDay } from '@/constants';
import { SwimlaneArrowRedrawContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import { useSwimlaneBoard } from '@/features/swimlane/SwimlaneBoardContext';

function noop(): void {}

/**
 * Доска глазами карточки: общее для всех карточек дорожек берётся из контекста, а не пропсами.
 * У призрака предложения агента клика, QA-задач и перерисовки стрелок нет.
 */
export function useTaskBarBoard(planPatchGhost: boolean) {
  const board = useSwimlaneBoard();
  const arrowRedrawFromLane = useContext(SwimlaneArrowRedrawContext);
  return {
    developers: board.developers,
    globalNameFilter: board.globalNameFilter,
    qaTasksMap: planPatchGhost ? undefined : board.qaTasksMap,
    requestArrowRedraw: planPatchGhost ? noop : (arrowRedrawFromLane ?? noop),
    selectedSprintId: board.selectedSprintId,
    swimlaneTimelineTotalParts: board.sprintTimelineWorkingDays * getPartsPerDay(),
    onClick: planPatchGhost ? undefined : board.onTaskClick,
  };
}

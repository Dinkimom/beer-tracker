import type { Task } from '@/types';

import { useContext } from 'react';

import { getPartsPerDay } from '@/constants';
import { openCardContextMenu } from '@/features/context-menu/openCardContextMenu';
import { useSprintBoard } from '@/features/sprint/model/SprintBoardContext';
import { SwimlaneArrowRedrawContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import { useSwimlaneBoard } from '@/features/swimlane/SwimlaneBoardContext';
import { useRootStore } from '@/lib/layers';

function noop(): void {}

/**
 * Доска глазами карточки: общее для всех карточек дорожек берётся из контекста, а не пропсами.
 * У призрака предложения агента клика, QA-задач и перерисовки стрелок нет. Меню, создание QA,
 * правка заметок и удаление фото-черновика отключены и у призрака, и в режиме связей.
 */
export function useTaskBarBoard(planPatchGhost: boolean, linkingActive: boolean) {
  const board = useSwimlaneBoard();
  const sprintBoard = useSprintBoard();
  const arrowRedrawFromLane = useContext(SwimlaneArrowRedrawContext);
  const actionsOff = planPatchGhost || linkingActive;
  const { sprintPlannerUi } = useRootStore();
  return {
    commentActions: actionsOff ? undefined : board.commentActions,
    developers: sprintBoard.developers,
    globalNameFilter: board.globalNameFilter,
    qaTasksMap: planPatchGhost ? undefined : sprintBoard.qaTasksMap,
    requestArrowRedraw: planPatchGhost ? noop : (arrowRedrawFromLane ?? noop),
    selectedSprintId: board.selectedSprintId,
    swimlaneTimelineTotalParts: board.sprintTimelineWorkingDays * getPartsPerDay(),
    onClick: planPatchGhost ? undefined : board.onTaskClick,
    onContextMenu: actionsOff
      ? undefined
      : (e: React.MouseEvent, task: Task) => openCardContextMenu(sprintPlannerUi, e, task),
    onCreateQATask: actionsOff ? undefined : board.onCreateQATask,
    onDeleteLocalImage: actionsOff ? undefined : board.quickAdd?.onCancelQuickAddDraft,
  };
}

'use client';

import type { Task } from '@/types';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { PhaseCardColorSchemeOverride } from '@/components/PhaseCardColorSchemeOverride';
import { useCardContextMenu } from '@/features/context-menu/hooks/useCardContextMenu';
import { openCardContextMenu } from '@/features/context-menu/openCardContextMenu';
import { useSprintBoard } from '@/features/sprint/model/SprintBoardContext';
import { useAgentDevTask } from '@/features/task/components/TaskCard/AgentDevTasksContext';
import { TaskCardAgentBadge } from '@/features/task/components/TaskCard/components/TaskCardAgentBadge';
import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import { taskMatchesNameFilter } from '@/features/task/utils/taskMatchesNameFilter';
import { getTaskTrackerDisplayKey, isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { useRootStore } from '@/lib/layers';
import { sprintCardPresenceBlocksNewGestures } from '@/lib/realtime/sprintCardPresence';

import { KANBAN_CARD_SURFACE } from './kanbanChromeClasses';
import { kanbanTaskId } from './kanbanDndUtils';

interface KanbanDraggableCardProps {
  task: Task;
}

// observer: меню карточки, поиск по доске и разработчики читаются из сторов и модели.
export const KanbanDraggableCard = observer(function KanbanDraggableCard({ task }: KanbanDraggableCardProps) {
  const presenceLocked = useSprintCardPresenceLocked(task.id);
  const { sprintPlannerUi } = useRootStore();
  const { developers } = useSprintBoard();
  // Не подходит под поиск по доске — приглушена, как на свимлейне.
  const dimmedBySearch = !taskMatchesNameFilter(task, sprintPlannerUi.focus.globalNameFilter);
  const [ownDragActive, setOwnDragActive] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: kanbanTaskId(task.id),
    data: { task },
    disabled: sprintCardPresenceBlocksNewGestures(presenceLocked, ownDragActive),
  });

  useEffect(() => {
    setOwnDragActive(isDragging);
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }
    sprintPlannerUi.cards.setBoardDraggingTaskId(task.id);
    return () => {
      if (sprintPlannerUi.cards.boardDraggingTaskId === task.id) {
        sprintPlannerUi.cards.setBoardDraggingTaskId(null);
      }
    };
  }, [isDragging, sprintPlannerUi, task.id]);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : dimmedBySearch ? 0.3 : 1,
  };

  const { dimmed: dimOthers, open: menuOpenHere } = useCardContextMenu(task.id);
  const agentDev = useAgentDevTask(isEffectivelyQaTask(task) ? null : getTaskTrackerDisplayKey(task));
  const blockNewGestures = sprintCardPresenceBlocksNewGestures(presenceLocked, isDragging);

  return (
    <div
      ref={setNodeRef}
      className={`${
        blockNewGestures ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
      } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
        menuOpenHere ? 'overflow-visible relative z-20' : 'relative overflow-hidden'
      } ${
        dimOthers
          ? 'opacity-50 pointer-events-none transition-opacity duration-200'
          : ''
      }`}
      data-context-menu-source="task-card"
      style={style}
      {...(blockNewGestures ? {} : listeners)}
      {...attributes}
      onContextMenu={(e) => {
        if (blockNewGestures) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        openCardContextMenu(sprintPlannerUi, e, task);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
        }
      }}
      onMouseEnter={() => sprintPlannerUi.cards.setHoveredTaskId(task.id)}
      onMouseLeave={() => {
        if (sprintPlannerUi.cards.hoveredTaskId === task.id) {
          sprintPlannerUi.cards.setHoveredTaskId(null);
        }
      }}
    >
      <PhaseCardColorSchemeOverride value="monochrome">
        <TaskCard
          assigneeName={task.assigneeName}
          className={KANBAN_CARD_SURFACE}
          developers={developers}
          isContextMenuOpen={menuOpenHere}
          task={task}
          variant="sidebar"
        />
      </PhaseCardColorSchemeOverride>
      {agentDev ? (
        <TaskCardAgentBadge
          agentDev={agentDev}
          className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md border shadow-sm"
          // В канбане нет чата агента — значок только показывает, что задачей занимается агент.
          interactive={false}
        />
      ) : null}
    </div>
  );
});

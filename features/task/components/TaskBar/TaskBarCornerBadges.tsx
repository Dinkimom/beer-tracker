'use client';

import type { Task } from '@/types';

import { observer } from 'mobx-react-lite';

import { ZIndex } from '@/constants';
import { TaskCardSwimlaneSegmentBadge } from '@/features/task/components/TaskCard/components/TaskCardSwimlaneSegmentBadge';
import { useRootStore } from '@/lib/layers';

import { TaskBarQACreateButton, isTaskBarQACreateAvailable } from './components/TaskBarQACreateButton';
import { TaskBarCornerRail } from './TaskBarCornerRail';
import { TaskBarHiddenLinksBadge } from './TaskBarHiddenLinksBadge';
import { TaskBarPlanMovedBadge } from './TaskBarPlanMovedBadge';
import { TaskBarPlanningErrorBadge } from './TaskBarPlanningErrorBadge';

interface TaskBarCornerBadgesProps {
  effectiveIsDragging: boolean;
  errorTooltip?: string;
  hasQATaskInSwimlane: boolean;
  interactionDisabled: boolean;
  isInError: boolean;
  isQATask: boolean;
  isSelected: boolean;
  planAnchorMoved: 'earlier' | 'later' | null;
  swimlaneSegmentBadge?: { index: number; total: number } | null;
  /** Не первый отрезок сегментированной карточки: значки задачи живут на первом. */
  swimlaneSegmentSecondary: boolean;
  task: Task;
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
}

/**
 * Все значки и кнопки на углах карточки — в двух рейках с общими правилами.
 * Левая — состояние задачи: наложение, номер отрезка, перенос относительно плана на старте.
 * Правая — действия и связи: добавить QA, скрытые связи.
 */
export const TaskBarCornerBadges = observer(function TaskBarCornerBadges(
  props: TaskBarCornerBadgesProps
) {
  const { interactionDisabled, swimlaneSegmentBadge, swimlaneSegmentSecondary, task } = props;
  const { sprintPlannerUi } = useRootStore();
  const primary = !swimlaneSegmentSecondary;
  const hiddenLinks = primary ? (sprintPlannerUi.hiddenLinkCountByTaskId.get(task.id) ?? 0) : 0;
  const { onCreateQATask } = props;
  const qaAvailable =
    primary && isTaskBarQACreateAvailable({ ...props, isDragging: props.effectiveIsDragging });

  const left = [
    primary && props.isInError
      ? {
          key: 'error',
          node: (
            <TaskBarPlanningErrorBadge
              errorTooltip={props.errorTooltip}
              interactionDisabled={interactionDisabled}
            />
          ),
        }
      : null,
    swimlaneSegmentBadge
      ? {
          key: 'segment',
          node: (
            <TaskCardSwimlaneSegmentBadge
              interactionDisabled={interactionDisabled}
              swimlaneSegmentBadge={swimlaneSegmentBadge}
            />
          ),
        }
      : null,
    props.planAnchorMoved
      ? {
          key: 'moved',
          node: (
            <TaskBarPlanMovedBadge
              direction={props.planAnchorMoved}
              interactionDisabled={interactionDisabled}
            />
          ),
        }
      : null,
  ].filter((item) => item != null);

  const right = [
    qaAvailable && onCreateQATask
      ? { key: 'qa', node: <TaskBarQACreateButton task={task} onCreateQATask={onCreateQATask} /> }
      : null,
    hiddenLinks > 0
      ? {
          key: 'links',
          node: <TaskBarHiddenLinksBadge count={hiddenLinks} interactionDisabled={interactionDisabled} />,
        }
      : null,
  ].filter((item) => item != null);

  if (left.length === 0 && right.length === 0) return null;
  // Container query живёт на обёртке нулевой высоты, а не на всей карточке:
  // containment карточки сломал бы fixed-попапы внутри неё (упоминания, диалоги).
  return (
    <div
      className="@container pointer-events-none absolute inset-x-0 top-0 h-0"
      style={{ zIndex: ZIndex.value('dropdown') }}
    >
      <TaskBarCornerRail items={left} side="left" />
      <TaskBarCornerRail items={right} side="right" />
    </div>
  );
});

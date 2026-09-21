'use client';

import type { Task } from '@/types';
import type { ChecklistItem, SprintInfo, SprintListItem } from '@/types/tracker';

import { useMemo } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { FinishSprintChecklist } from '@/features/sprint/components/FinishSprintModal/components/FinishSprintChecklist';
import { FinishSprintTaskTransfer } from '@/features/sprint/components/FinishSprintModal/components/FinishSprintTaskTransfer';
import { useFinishSprintModal } from '@/features/sprint/components/FinishSprintModal/hooks/useFinishSprintModal';
import { isFinishSprintTransferTarget } from '@/features/sprint/components/FinishSprintModal/hooks/useFinishSprintModalHelpers';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

interface GoalTaskWithItems {
  checklistItems: ChecklistItem[];
  id: string;
  /** Источник целей: трекер (задача) или таблица sprint_goals */
  source?: 'sprint_goals' | 'tracker';
}

interface FinishSprintModalProps {
  /** Задачи на цели с чеклистами (delivery + discovery) */
  goalTasks: GoalTaskWithItems[];
  isOpen: boolean;
  sprintInfo: {
    id: number;
    status: string;
    version?: number;
  } | null;
  sprints: SprintListItem[];
  tasks: Task[];
  onClose: () => void;
  onSprintStatusChange?: (updatedSprint: SprintInfo) => void;
  onTasksReload?: () => void;
}

export function FinishSprintModal({
  isOpen,
  onClose,
  goalTasks,
  sprintInfo,
  sprints,
  tasks,
  onSprintStatusChange,
  onTasksReload,
}: FinishSprintModalProps) {
  const initialChecklistItems = useMemo(
    () =>
      goalTasks.flatMap((g) =>
        g.checklistItems.map((item) => ({
          ...item,
          goalTaskId: g.id,
          goalSource: g.source ?? 'tracker',
        }))
      ),
    [goalTasks]
  );
  const finishSprint = useFinishSprintModal({
    goalTasks: goalTasks.map((g) => ({ id: g.id, source: g.source })),
    initialChecklistItems,
    sprintInfo,
    sprints,
    tasks,
    isOpen,
    onSprintStatusChange,
    onTasksReload,
  });

  const draftSprints = sprints.filter(isFinishSprintTransferTarget);

  const handleSubmit = async () => {
    await finishSprint.handleSubmit();
    onClose();
  };

  const overlay = useOverlayPresence(isOpen);
  if (!overlay.mounted) return null;

  const content = (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/70 ${OVERLAY_BACKDROP_ENTER}`}
      data-state={overlay.state}
      style={{ zIndex: ZIndex.modalBackdrop }}
      onAnimationEnd={overlay.onAnimationEnd}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto ${OVERLAY_PANEL_ENTER}`}
        data-state={overlay.state}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Завершить спринт
          </h2>

          <div className="space-y-6">
            {/* Цели спринта */}
            <FinishSprintChecklist
              checklistItems={finishSprint.checklistItems}
              updatingItems={finishSprint.updatingItems}
              onCheckboxChange={finishSprint.handleCheckboxChange}
            />

            {/* Перенос незавершенных задач */}
            <FinishSprintTaskTransfer
              draftSprints={draftSprints}
              moveTasksTo={finishSprint.moveTasksTo}
              selectedSprintId={finishSprint.selectedSprintId}
              onMoveTasksToChange={finishSprint.setMoveTasksTo}
              onSelectedSprintIdChange={finishSprint.setSelectedSprintId}
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              className="flex-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={finishSprint.isLoading}
              variant="secondary"
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={finishSprint.isLoading}
              variant="danger"
              onClick={handleSubmit}
            >
              {finishSprint.isLoading ? 'Завершение...' : 'Завершить спринт'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

'use client';

import type { Task } from '@/types';
import type { ChecklistItem, SprintInfo, SprintListItem } from '@/types/tracker';

import { useMemo } from 'react';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useI18n } from '@/contexts/LanguageContext';
import { FinishSprintChecklist } from '@/features/sprint/components/FinishSprintModal/components/FinishSprintChecklist';
import { FinishSprintTaskTransfer } from '@/features/sprint/components/FinishSprintModal/components/FinishSprintTaskTransfer';
import { useFinishSprintModal } from '@/features/sprint/components/FinishSprintModal/hooks/useFinishSprintModal';
import { isFinishSprintTransferTarget } from '@/features/sprint/components/FinishSprintModal/hooks/useFinishSprintModalHelpers';

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
  const { t } = useI18n();
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

  return (
    <Modal
      className="max-w-2xl"
      closeOnBackdrop={false}
      footer={
        <>
          <Button disabled={finishSprint.isLoading} variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={finishSprint.isLoading} variant="danger" onClick={handleSubmit}>
            {finishSprint.isLoading ? t('task.finishSprint.submitting') : t('task.finishSprint.submit')}
          </Button>
        </>
      }
      open={isOpen}
      title={t('task.finishSprint.title')}
      onClose={onClose}
    >
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
    </Modal>
  );
}

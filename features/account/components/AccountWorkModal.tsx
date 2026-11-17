'use client';

import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useId, useState } from 'react';

import { Modal } from '@/components/Modal';
import { ModalFormActions } from '@/components/ModalFormActions';
import { useI18n } from '@/contexts/LanguageContext';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import { TaskTimeline } from '@/features/task/components/TaskTimeline';

import { AccountWorkForm } from './AccountWorkModal/components/AccountWorkForm';
import { useAccountWorkModal } from './AccountWorkModal/hooks/useAccountWorkModal';

interface AccountWorkModalProps {
  currentSprintId: number | null;
  isOpen: boolean;
  sprints: SprintListItem[];
  task: Task | null;
  onClose: () => void;
  onConfirm: (data: {
    burnedStoryPoints: number;
    burnedTestPoints: number;
    newTaskTitle: string;
    remainingStoryPoints: number;
    remainingTestPoints: number;
    targetSprintId: number | null;
  }) => Promise<void>;
}

export function AccountWorkModal({
  isOpen,
  onClose,
  task,
  sprints,
  currentSprintId,
  onConfirm,
}: AccountWorkModalProps) {
  const { t } = useI18n();
  const [latchedTask, setLatchedTask] = useState(task);
  if (task && task !== latchedTask) {
    setLatchedTask(task);
  }
  const displayTask = task ?? latchedTask;
  const formId = useId();
  const {
    burnedStoryPoints,
    setBurnedStoryPoints,
    burnedTestPoints,
    setBurnedTestPoints,
    remainingStoryPoints,
    setRemainingStoryPoints,
    remainingTestPoints,
    setRemainingTestPoints,
    newTaskTitle,
    setNewTaskTitle,
    targetSprintId,
    setTargetSprintId,
    isLoading,
    availableSprints,
    handleSubmit,
  } = useAccountWorkModal({
    isOpen,
    task: displayTask,
    sprints,
    currentSprintId,
    onConfirm,
    onClose,
  });

  if (!displayTask) return null;

  return (
    <Modal
      closeOnBackdrop={false}
      footer={
        <ModalFormActions
          busy={isLoading}
          busyLabel={t('account.workModal.processing')}
          formId={formId}
          submitLabel={t('account.workModal.confirm')}
          onCancel={onClose}
        />
      }
      open={isOpen}
      title={t('account.workModal.title')}
      onClose={onClose}
    >
      {/* Карточка задачи */}
      <div>
        <TaskCard
          className="pointer-events-auto"
          isContextMenuOpen={false}
          isDragging={false}
          isResizing={false}
          isSelected={false}
          task={displayTask}
          variant="sidebar"
          widthPercent={100}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      </div>

      {/* Таймлайн задачи */}
      <TaskTimeline issueKey={displayTask.id} />

      <AccountWorkForm
        availableSprints={availableSprints}
        burnedStoryPoints={burnedStoryPoints}
        burnedTestPoints={burnedTestPoints}
        formId={formId}
        isLoading={isLoading}
        newTaskTitle={newTaskTitle}
        remainingStoryPoints={remainingStoryPoints}
        remainingTestPoints={remainingTestPoints}
        setBurnedStoryPoints={setBurnedStoryPoints}
        setBurnedTestPoints={setBurnedTestPoints}
        setNewTaskTitle={setNewTaskTitle}
        setRemainingStoryPoints={setRemainingStoryPoints}
        setRemainingTestPoints={setRemainingTestPoints}
        setTargetSprintId={setTargetSprintId}
        targetSprintId={targetSprintId}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
}

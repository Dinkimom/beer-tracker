'use client';

import type { TransitionItem } from '@/lib/beerTrackerApi';
import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useI18n } from '@/contexts/LanguageContext';
import { StatusSubmenuTransitionList } from '@/features/context-menu/components/StatusSubmenuTransitionList';

interface KanbanColumnStatusChoiceModalProps {
  columnName: string;
  task: Task;
  transitions: TransitionItem[];
  onClose: () => void;
  onSelect: (transition: TransitionItem) => void;
}

export function KanbanColumnStatusChoiceModal({
  columnName,
  task,
  transitions,
  onClose,
  onSelect,
}: KanbanColumnStatusChoiceModalProps) {
  const { t } = useI18n();

  return (
    <Modal
      description={t('sprintPlanner.kanban.chooseStatusDescription', { column: columnName })}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('task.transitionFields.cancel')}
        </Button>
      }
      title={t('sprintPlanner.kanban.chooseStatusTitle')}
      onClose={onClose}
    >
      <StatusSubmenuTransitionList
        isLoading={false}
        isLoadingTransitions={false}
        statusTransitions={transitions}
        task={task}
        onSelect={(transitionId) => {
          const transition = transitions.find((item) => item.id === transitionId);
          if (transition) onSelect(transition);
        }}
      />
    </Modal>
  );
}

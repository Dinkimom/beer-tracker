'use client';

import type { TransitionItem } from '@/lib/beerTrackerApi';
import type { Task } from '@/types';

import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { OVERLAY_BACKDROP_ENTER, OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { StatusSubmenuTransitionList } from '@/features/context-menu/components/StatusSubmenuTransitionList';
import { useWindowEscape } from '@/hooks/useWindowEscape';

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

  useWindowEscape(onClose);

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70 ${OVERLAY_BACKDROP_ENTER}`}
      style={{ zIndex: ZIndex.modalBackdrop }}
      onClick={onClose}
    >
      <div
        aria-labelledby="kanban-status-choice-title"
        aria-modal="true"
        className={`flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800 ${OVERLAY_PANEL_ENTER}`}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          <h2
            className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
            id="kanban-status-choice-title"
          >
            {t('sprintPlanner.kanban.chooseStatusTitle')}
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {t('sprintPlanner.kanban.chooseStatusDescription', { column: columnName })}
          </p>
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
        </div>
        <div className="flex flex-shrink-0 justify-end border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <Button className="rounded-md text-sm" variant="secondary" onClick={onClose}>
            {t('task.transitionFields.cancel')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

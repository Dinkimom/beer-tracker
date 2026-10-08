'use client';

import type { Developer, Task } from '@/types';

import { useDraggable } from '@dnd-kit/core';
import { useRef } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { resolveTaskCardDisplayId } from '@/features/task/components/TaskCard/components/taskCardContentHelpers';

import { BACKLOG_ROW_HOVER, BACKLOG_ROW_SELECTED } from './backlogChromeClasses';
import { useBacklogSelection } from './BacklogSelectionProvider';
import { BacklogTaskRowView } from './BacklogTaskRowView';

interface BacklogTaskRowProps {
  developers: Developer[];
  /** Секция выбора. Без неё строка только перетаскивается — так у завершённых спринтов. */
  scopeId?: string;
  task: Task;
}

export function BacklogTaskRow({ developers, scopeId, task }: BacklogTaskRowProps) {
  const { t } = useI18n();
  const { isSelected, toggle } = useBacklogSelection();
  const shiftKeyRef = useRef(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { source: 'sidebar' as const },
  });
  const selected = scopeId != null && isSelected(task.id);
  const rowTone = selected ? BACKLOG_ROW_SELECTED : BACKLOG_ROW_HOVER;
  const dragClass = `min-w-0 flex-1 cursor-grab select-none active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`;

  if (scopeId == null) {
    return (
      <div ref={setNodeRef} className={dragClass} {...listeners} {...attributes}>
        <BacklogTaskRowView developers={developers} task={task} />
      </div>
    );
  }

  const taskKey = resolveTaskCardDisplayId(task);

  return (
    <div ref={setNodeRef} className={`flex min-w-0 items-center gap-3 px-4 py-2 ${rowTone}`}>
      <input
        aria-label={t('backlog.bulk.selectTask', { key: taskKey })}
        checked={selected}
        className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600 dark:accent-blue-500"
        type="checkbox"
        onChange={() => {
          const shiftKey = shiftKeyRef.current;
          shiftKeyRef.current = false;
          toggle(scopeId, task.id, shiftKey);
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          shiftKeyRef.current = event.shiftKey;
        }}
        onPointerDown={(event) => {
          shiftKeyRef.current = event.shiftKey;
          event.stopPropagation();
        }}
      />
      <div className={`flex items-center gap-3 ${dragClass}`} {...listeners} {...attributes}>
        <BacklogTaskRowView developers={developers} embedded task={task} />
      </div>
    </div>
  );
}

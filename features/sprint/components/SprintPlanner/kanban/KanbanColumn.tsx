'use client';

import type { Task, Developer } from '@/types';

import { useDroppable } from '@dnd-kit/core';

import { useI18n } from '@/contexts/LanguageContext';

import {
  KANBAN_COLUMN_BODY,
  resolveKanbanColumnChromeClass,
} from './kanbanChromeClasses';
import { KanbanColumnHeader } from './KanbanColumnHeader';
import { kanbanColumnId } from './kanbanDndUtils';
import { KanbanDraggableCard } from './KanbanDraggableCard';

interface KanbanColumnProps {
  columnId: string;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  globalNameFilter?: string;
  /** Шапка внутри колонки (режим без группировки по lane). */
  header?: {
    displayName: string;
    taskCount: number;
    totalSp: number;
    totalTp: number;
  };
  /** Идёт перетаскивание задачи (показывать оверлей на недоступных колонках) */
  isDragging?: boolean;
  /** В режиме перетаскивания колонка недоступна для дропа — показываем предупреждение */
  isDropDisabled?: boolean;
  /** Колонка, из которой перетаскивают — не подсвечиваем ошибкой */
  isSourceColumn?: boolean;
  tasks: Task[];
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onTaskClick?: (taskId: string) => void;
}

function taskMatchesFilter(task: Task, filter: string): boolean {
  if (!filter.trim()) return true;
  const q = filter.trim().toLowerCase();
  return (
    task.name.toLowerCase().includes(q) ||
    task.id.toLowerCase().includes(q) ||
    (task.assigneeName?.toLowerCase().includes(q) ?? false)
  );
}

export function KanbanColumn({
  columnId,
  tasks,
  developers,
  globalNameFilter = '',
  header,
  isDragging = false,
  isDropDisabled = false,
  isSourceColumn = false,
  contextMenuBlurOtherCards = false,
  contextMenuTaskId = null,
  onTaskClick,
  onContextMenu,
}: KanbanColumnProps) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({
    id: kanbanColumnId(columnId),
  });

  const filteredTasks = globalNameFilter
    ? tasks.filter((task) => taskMatchesFilter(task, globalNameFilter))
    : tasks;

  const showForbiddenBanner = isDragging && isDropDisabled && !isSourceColumn;
  const chromeClass = resolveKanbanColumnChromeClass(isOver, isDropDisabled);

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-h-[120px] w-[280px] max-w-[280px] min-w-[280px] shrink-0 flex-col overflow-hidden transition-colors ${chromeClass}`}
      data-kanban-column={columnId}
    >
      {header ? (
        <KanbanColumnHeader
          displayName={header.displayName}
          taskCount={header.taskCount}
          totalSp={header.totalSp}
          totalTp={header.totalTp}
        />
      ) : null}
      <div
        className={KANBAN_COLUMN_BODY}
        style={{ overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto' }}
      >
        {showForbiddenBanner && (
          <div
            aria-hidden
            className="shrink-0 rounded-lg border border-red-400/50 bg-red-500/15 px-3 py-2 dark:border-red-500/40 dark:bg-red-600/20"
          >
            <p className="text-center text-xs font-medium leading-tight text-red-800 dark:text-red-200">
              {t('sprintPlanner.kanban.dropForbidden')}
            </p>
          </div>
        )}
        {filteredTasks.map((task) => (
          <KanbanDraggableCard
            key={task.id}
            contextMenuBlurOtherCards={contextMenuBlurOtherCards}
            contextMenuTaskId={contextMenuTaskId}
            developers={developers}
            task={task}
            onContextMenu={onContextMenu}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}

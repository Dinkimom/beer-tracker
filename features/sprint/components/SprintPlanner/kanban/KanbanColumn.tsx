'use client';

import type { Task, Developer } from '@/types';

import { useDroppable } from '@dnd-kit/core';

import { useI18n } from '@/contexts/LanguageContext';

import { kanbanColumnId } from './kanbanDndUtils';
import { KanbanDraggableCard } from './KanbanDraggableCard';

interface KanbanColumnProps {
  columnId: string;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  globalNameFilter?: string;
  /** Включена группировка по исполнителю — колонка со скруглением и границей со всех сторон */
  groupByAssignee?: boolean;
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
  groupByAssignee = false,
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
    ? tasks.filter((t) => taskMatchesFilter(t, globalNameFilter))
    : tasks;

  const showForbiddenBanner = isDragging && isDropDisabled && !isSourceColumn;

  const roundAndBorderClass = groupByAssignee
    ? 'rounded-lg border'
    : 'rounded-b-lg border border-t-0';

  return (
    <div
      ref={setNodeRef}
      className={`relative flex flex-col min-w-[280px] w-[280px] max-w-[280px] shrink-0 ${roundAndBorderClass} overflow-hidden dark:shadow-none transition-colors ${
        isOver && !isDropDisabled
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
      }`}
      data-kanban-column={columnId}
    >
      <div
        className="flex-1 min-h-0 p-2 space-y-2 min-h-[120px] overflow-y-auto"
        style={{ overscrollBehaviorX: 'auto', overscrollBehaviorY: 'auto' }}
      >
        {showForbiddenBanner && (
          <div
            aria-hidden
            className="shrink-0 rounded-md bg-red-500/20 dark:bg-red-600/30 border border-red-400 dark:border-red-500 px-3 py-2"
          >
            <p className="text-center text-xs font-medium text-red-800 dark:text-red-200 leading-tight">
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

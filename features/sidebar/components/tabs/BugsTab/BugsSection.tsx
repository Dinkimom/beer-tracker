'use client';

import type { ClassifiedSlaBug, SlaBugSection } from '@/lib/slaBugs';

import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';
import { DraggableTask } from '@/features/task/components/DraggableTask';

interface BugsSectionProps {
  boardId: number | null | undefined;
  bugs: ClassifiedSlaBug[];
  collapsedByDefault?: boolean;
  section: SlaBugSection;
}

export function BugsSection({
  section,
  bugs,
  boardId,
  collapsedByDefault = false,
}: BugsSectionProps) {
  const { t } = useI18n();
  const {
    activeTaskDuration,
    activeTaskId,
    contextMenuBlurOtherCards,
    contextMenuTaskId,
    developers,
    onAutoAddToSwimlane,
    onContextMenu,
    selectedSprintId,
    viewMode,
    width: sidebarWidth,
  } = useTaskSidebar();
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  const count = bugs.length;

  return (
    <section className="mb-4">
      <button
        aria-expanded={!collapsed}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md bg-black/[0.06] px-3 py-2 text-left transition-all duration-200 hover:bg-black/10 active:scale-[0.98] active:bg-black/[0.16] dark:bg-white/[0.06] dark:hover:bg-white/10 dark:active:bg-white/[0.16]"
        type="button"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-100">
          {t(`sidebar.bugsTab.sections.${section}`)}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              count > 0
                ? 'bg-blue-600 text-white dark:bg-blue-500/25 dark:text-blue-200'
                : 'bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
            }`}
          >
            {count}
          </span>
          <Icon
            className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
            name={collapsed ? 'chevron-right' : 'chevron-down'}
          />
        </span>
      </button>
      {!collapsed && count > 0 && (
        <div className="mt-2 space-y-2.5">
          {bugs.map((bug) => (
            <DraggableTask
              key={bug.task.id}
              activeTaskDuration={activeTaskDuration}
              activeTaskId={activeTaskId}
              contextMenuBlurOtherCards={contextMenuBlurOtherCards}
              contextMenuTaskId={contextMenuTaskId}
              developers={developers}
              selectedSprintId={selectedSprintId ?? undefined}
              sidebarWidth={sidebarWidth}
              slaBugBoardId={boardId}
              slaBugCloseP4ActionsEnabled={bug.primaryLabel === 'close_p4'}
              slaBugDemoteReason={bug.demoteReason}
              slaBugSignalLabel={bug.primaryLabel ?? undefined}
              task={bug.task}
              viewMode={viewMode}
              onAutoAddToSwimlane={onAutoAddToSwimlane}
              onContextMenu={
                onContextMenu ? (e, task) => onContextMenu(e, task, false) : undefined
              }
            />
          ))}
        </div>
      )}
      {!collapsed && count === 0 ? (
        <p className="mt-2 px-1 text-xs text-gray-500 dark:text-gray-400">
          {t('sidebar.bugsTab.sectionEmpty')}
        </p>
      ) : null}
    </section>
  );
}

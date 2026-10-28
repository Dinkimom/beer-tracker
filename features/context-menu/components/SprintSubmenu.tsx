'use client';

import type { SprintListItem } from '@/types/tracker';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { ContextMenuRow } from '@/features/context-menu/components/ContextMenuRow';
import {
  MENU_ROW,
  MENU_ROW_ICON,
  MENU_ROW_STACK,
  MENU_ROW_VALUE,
} from '@/features/context-menu/contextMenuClasses';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

import { ContextSubmenu } from './ContextSubmenu';

interface SprintSubmenuProps {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  currentSprintId: number | null;
  isBacklogTask: boolean;
  isLoading: boolean;
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  sprints: SprintListItem[];
  /** Есть — клик по спринту раскрывает выбор «в бэклог спринта / запланировать». */
  onPlan?: (sprintId: number) => void;
  onSelect: (sprintId: number) => void;
  onToggle: () => void;
}

/** Коротко, чтобы встать справа в строке: «13.10 – 24.10.26». */
function formatSprintDates(sprint: SprintListItem, noDatesLabel: string): string {
  if (!sprint.startDate || !sprint.endDate) {
    return noDatesLabel;
  }
  const start = new Date(sprint.startDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  const end = new Date(sprint.endDate).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  return `${start} – ${end}`;
}


export function SprintSubmenu({
  sprints,
  currentSprintId,
  isBacklogTask,
  isOpen,
  menuRef,
  buttonRef,
  isLoading,
  onPlan,
  onToggle,
  onSelect,
}: SprintSubmenuProps) {
  const { t } = useI18n();
  const [expandedSprintId, setExpandedSprintId] = useState<number | null>(null);

  const availableSprints = isBacklogTask
    ? sprints.filter((s) => !s.archived && (s.status === 'in_progress' || s.status === 'draft'))
    : sprints.filter((s) => s.id !== currentSprintId && !s.archived);

  if (availableSprints.length === 0) {
    return null;
  }

  const rootLabel = isBacklogTask
    ? t('sprintPlanner.contextMenu.addToSprint')
    : t('sprintPlanner.contextMenu.moveToSprint');

  return (
    <ContextSubmenu
      bodyClassName="max-h-[320px]"
      buttonRef={buttonRef}
      disabled={isLoading}
      icon="calendar"
      isOpen={isOpen}
      label={rootLabel}
      menuRef={menuRef}
      panelClassName="min-w-[280px] max-w-[min(340px,calc(100vw-40px))]"
      onToggle={onToggle}
    >
            {availableSprints.map((sprint) => {
              const expanded = onPlan != null && expandedSprintId === sprint.id;
              return (
                <div
                  key={sprint.id}
                  className={`${MENU_ROW_STACK} ${expanded ? 'rounded-md bg-black/[0.04] pb-0.5 dark:bg-white/[0.06]' : ''}`}
                >
                  <Button
                    aria-expanded={onPlan ? expanded : undefined}
                    className={MENU_ROW}
                    disabled={isLoading || sprint.id === currentSprintId}
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (!onPlan) {
                        onSelect(sprint.id);
                        return;
                      }
                      setExpandedSprintId(expanded ? null : sprint.id);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {formatSprintListItemDisplayName(sprint)}
                    </span>
                    <span className={MENU_ROW_VALUE}>
                      {formatSprintDates(sprint, t('sprintPlanner.contextMenu.sprintNoDates'))}
                    </span>
                    {onPlan ? (
                      <Icon
                        aria-hidden
                        className={`-mr-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${
                          expanded ? 'rotate-180' : ''
                        }`}
                        name="chevron-down"
                      />
                    ) : null}
                  </Button>
                  {expanded ? (
                    <>
                      <ContextMenuRow
                        className="!pl-4"
                        disabled={isLoading}
                        icon={<Icon aria-hidden className={MENU_ROW_ICON} name="backlog" />}
                        label={t('sprintPlanner.contextMenu.moveToSprintBacklog')}
                        onClick={() => onSelect(sprint.id)}
                      />
                      <ContextMenuRow
                        className="!pl-4"
                        disabled={isLoading}
                        icon={<Icon aria-hidden className={MENU_ROW_ICON} name="plan-add" />}
                        label={t('sprintPlanner.contextMenu.planInSprint')}
                        title={t('sprintPlanner.contextMenu.planInSprintHint')}
                        onClick={() => onPlan(sprint.id)}
                      />
                    </>
                  ) : null}
                </div>
              );
            })}
    </ContextSubmenu>
  );
}

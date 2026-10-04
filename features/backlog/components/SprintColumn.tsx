'use client';

import type { StatusFilter } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useMemo, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { filterTasksByAssignees } from '@/features/backlog/utils/backlogFilterPeople';
import { SprintStatusTag } from '@/features/sprint/components/SprintStatusTag';
import { filterTasksByName, filterTasksByStatus } from '@/features/task/hooks/useTaskFilteringHelpers';
import { useTasks } from '@/features/task/hooks/useTasks';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

import { useBacklogTaskPreview } from '../hooks/useBacklogTaskPreview';
import { useRegisterBacklogVisibleTasks } from '../hooks/useRegisterBacklogVisibleTasks';
import { backlogSectionCountKey, backlogTaskPreviewResetKey } from '../utils/backlogTaskPreview';
import { formatSprintRangeLabel } from '../utils/sprintUtils';

import { BacklogPointsBreakdown } from './BacklogPointsBreakdown';
import { BacklogSectionFrame } from './BacklogSectionFrame';
import { SprintColumnTasks } from './SprintColumnTasks';

interface SprintColumnProps {
  assigneeIds: ReadonlySet<string>;
  boardId: number | null;
  nameFilter: string;
  sprint: SprintListItem;
  statusFilter: StatusFilter;
}

export function SprintColumn({ assigneeIds, sprint, boardId, nameFilter, statusFilter }: SprintColumnProps) {
  const { language, t } = useI18n();
  const dateLocale = language === 'en' ? 'en-US' : 'ru-RU';
  const [expanded, setExpanded] = useState(true);
  const { data, isLoading, error, refetch } = useTasks(sprint.id, boardId);
  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const developers = data?.developers || [];
  const visibleTasks = useMemo(
    () =>
      filterTasksByAssignees(
        filterTasksByStatus(filterTasksByName(tasks, nameFilter), statusFilter),
        assigneeIds
      ),
    [assigneeIds, nameFilter, statusFilter, tasks]
  );
  const filtersActive = nameFilter.trim() !== '' || statusFilter !== 'all' || assigneeIds.size > 0;
  const scopeId = `sprint:${sprint.id}`;
  useRegisterBacklogVisibleTasks(scopeId, visibleTasks);
  const { hiddenCount, shownTasks, onShowMore } = useBacklogTaskPreview(
    visibleTasks,
    backlogTaskPreviewResetKey({ assigneeIds, nameFilter, statusFilter })
  );
  const dateLabel = formatSprintRangeLabel(sprint.startDate, sprint.endDate, dateLocale);
  const sectionCount = backlogSectionCountKey(shownTasks.length, tasks.length);

  return (
    <BacklogSectionFrame
      countLabel={isLoading ? undefined : t(sectionCount.key, sectionCount.params)}
      droppableId={`sprint-column-${sprint.id}`}
      expanded={expanded}
      meta={
        <>
          {dateLabel ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">{dateLabel}</span>
          ) : null}
          <SprintStatusTag archived={sprint.archived} status={sprint.status} />
          <BacklogPointsBreakdown tasks={visibleTasks} />
        </>
      }
      title={formatSprintListItemDisplayName(sprint)}
      onToggle={() => setExpanded((open) => !open)}
    >
      <SprintColumnTasks
        developers={developers}
        emptyLabel={
          filtersActive && tasks.length > 0 && visibleTasks.length === 0
            ? t('backlog.filters.noMatches')
            : t('backlog.sprintColumn.empty')
        }
        error={error}
        hiddenCount={hiddenCount}
        isLoading={isLoading}
        loadErrorTitle={t('backlog.sprintColumn.loadErrorTitle')}
        loadingLabel={t('backlog.sprintColumn.loading')}
        retryLabel={t('backlog.sprintColumn.retry')}
        scopeId={scopeId}
        tasks={shownTasks}
        unknownErrorLabel={t('common.unknownError')}
        onRetry={() => refetch()}
        onShowMore={onShowMore}
      />
    </BacklogSectionFrame>
  );
}

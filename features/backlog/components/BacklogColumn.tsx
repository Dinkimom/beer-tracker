'use client';

import type { Developer, Task } from '@/types';

import { useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

import { useBacklogTaskPreview } from '../hooks/useBacklogTaskPreview';
import { useRegisterBacklogVisibleTasks } from '../hooks/useRegisterBacklogVisibleTasks';
import { backlogSectionCountKey } from '../utils/backlogTaskPreview';

import { BacklogColumnTaskList } from './BacklogColumnTaskList';
import { BacklogPointsBreakdown } from './BacklogPointsBreakdown';
import { BacklogSectionFrame } from './BacklogSectionFrame';

interface BacklogColumnProps {
  developers: Developer[];
  emptyLabel?: string;
  loading: boolean;
  previewResetKey: string;
  tasks: Task[];
  totalTaskCount: number;
}

export function BacklogColumn({
  developers,
  emptyLabel,
  loading,
  previewResetKey,
  tasks,
  totalTaskCount,
}: BacklogColumnProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(true);
  useRegisterBacklogVisibleTasks('backlog', tasks);
  const { hiddenCount, shownTasks, onShowMore } = useBacklogTaskPreview(tasks, previewResetKey);
  const sectionCount = backlogSectionCountKey(shownTasks.length, totalTaskCount);

  return (
    <BacklogSectionFrame
      countLabel={loading ? undefined : t(sectionCount.key, sectionCount.params)}
      droppableId="backlog-column"
      expanded={expanded}
      meta={<BacklogPointsBreakdown tasks={tasks} />}
      title={t('backlog.column.title')}
      onToggle={() => setExpanded((open) => !open)}
    >
      <BacklogColumnTaskList
        developers={developers}
        emptyLabel={emptyLabel}
        hiddenCount={hiddenCount}
        loading={loading}
        tasks={shownTasks}
        onShowMore={onShowMore}
      />
    </BacklogSectionFrame>
  );
}

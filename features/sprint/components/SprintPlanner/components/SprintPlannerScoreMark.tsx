'use client';

import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import {
  clampSprintScoreMark,
  SprintScoreMarkInline,
} from '@/features/sprint/components/SprintScoreMarkInline';
import { fetchSprintScore } from '@/lib/api/sprints';

/** Пять кружек скора на панели спринта, рядом с работой, а не только в сайдбаре. */
export function SprintPlannerScoreMark({ sprintId }: { sprintId: number | null }) {
  const { t } = useI18n();
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const enabled = sprintId != null && sprintId > 0;
  const { data } = useQuery({
    queryKey: forDemoPlanner
      ? (['sprintScore', 'demo', sprintId] as const)
      : (['sprintScore', sprintId] as const),
    queryFn: () => fetchSprintScore(sprintId ?? 0),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
  const mark = data?.rows[0]?.mark;
  if (mark == null) {
    return null;
  }
  const filled = clampSprintScoreMark(mark);

  return (
    <SprintScoreMarkInline
      ariaLabel={t('sidebar.sprintScoreBlock.scoreMarkAria', { mark: String(filled) })}
      mark={filled}
      size="bar"
    />
  );
}

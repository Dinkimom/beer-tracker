'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { hrefWithSearchParams } from '@/features/sidebar/utils/hrefWithSearchParams';
import {
  clampSprintScoreMark,
  SprintScoreMarkInline,
} from '@/features/sprint/components/SprintScoreMarkInline';
import { fetchSprintScore } from '@/lib/api/sprints';
import { useRootStore } from '@/lib/layers';

/** Пять кружек скора на панели спринта: клик открывает сайдбар на вкладке метрик. */
export function SprintPlannerScoreMark({ sprintId }: { sprintId: number | null }) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const openMetricsSidebar = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sidebarTab', 'metrics');
    router.replace(hrefWithSearchParams(pathname, params), { scroll: false });
    sprintPlannerUi.setSidebarOpen(true);
  }, [pathname, router, searchParams, sprintPlannerUi]);

  if (mark == null) {
    return null;
  }
  const filled = clampSprintScoreMark(mark);

  return (
    <SprintScoreMarkInline
      ariaLabel={t('sidebar.sprintScoreBlock.openMetricsAria', { mark: String(filled) })}
      mark={filled}
      size="bar"
      onClick={openMetricsSidebar}
    />
  );
}

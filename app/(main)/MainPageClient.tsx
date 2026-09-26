'use client';

import type { SprintTab } from '@/components/PageHeader';
import type { SprintListItem } from '@/types/tracker';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { parseAsStringLiteral, useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { PageHeader } from '@/components/PageHeader';
import { PhaseCardColorSchemeProvider } from '@/components/PhaseCardColorSchemeContext';
import { Snow } from '@/components/Snow';
import { useI18n } from '@/contexts/LanguageContext';
import { PlannerOnboardingReplayBridge } from '@/contexts/PlannerOnboardingReplayBridge';
import { PlannerRemoteMediaProvider } from '@/contexts/PlannerRemoteMediaContext';
import { useBoards } from '@/features/board/hooks/useBoards';
import { SPRINTS_STALE_TIME_MS, sprintsQueryKey } from '@/features/sprint/hooks/useSprints';
import { fetchSprints } from '@/lib/beerTrackerApi';

import { MainPageClientAccessDeniedView } from './MainPageClientAccessDeniedView';
import {
  buildBoardChangeReplacePath,
  pickSprintForBoardChange,
} from './mainPageClientBoardChangeHelpers';
import { MainPageClientContent } from './MainPageClientContent';
import { MainPageClientErrorView } from './MainPageClientErrorView';
import { MainPageClientRedirectingView } from './MainPageClientRedirectingView';
import { computeMainPagePlannerAccessDenied } from './mainPagePlannerAccessDenied';
import { useMainPageClientData } from './useMainPageClientData';

const sprintTabParser = parseAsStringLiteral(['backlog', 'board', 'burndown']).withDefault('board');

/**
 * После первого подъёма MainPageClient в этой вкладке не показываем полноэкранный лоадер при remount
 * (например router.replace между /planner/:board/sprint/:sprint — иначе isMounted снова false на кадр).
 */
let mainPageClientShellEverReady = false;

interface MainPageClientProps {
  /** Если открыто по ссылке `/planner/:boardId/sprint/:sprintId` — проверяем доску в списке пользователя и синхронизируем хранилище */
  plannerBoardId?: number;
  plannerSprintId?: number;
}

export default function MainPageClient({ plannerBoardId, plannerSprintId }: MainPageClientProps = {}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { getBoardById, getBoardSelectorLabel, isLoading: boardsLoading } = useBoards();

  const [{ tab: activeTab }, setQueryStates] = useQueryStates(
    {
      tab: sprintTabParser,
    },
    { shallow: false }
  );

  const isPlannerDeepLink =
    plannerBoardId != null && plannerSprintId != null && !Number.isNaN(plannerBoardId) && !Number.isNaN(plannerSprintId);
  const plannerDeepLinkKey = isPlannerDeepLink ? `${plannerBoardId}-${plannerSprintId}` : null;

  const searchParamsKey = searchParams.toString();

  const [isMounted, setIsMounted] = useState(
    () => typeof window !== 'undefined' && mainPageClientShellEverReady
  );
  const [isBoardSwitchPending, setIsBoardSwitchPending] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      mainPageClientShellEverReady = true;
      setIsMounted(true);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    if (!params.has('page') && !params.has('epicId') && !params.has('featureId')) {
      return;
    }
    params.delete('page');
    params.delete('epicId');
    params.delete('featureId');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParamsKey]);

  const {
    checklistDone,
    checklistTotal,
    deliveryChecklistItems,
    deliveryGoalsLoading,
    discoveryChecklistItems,
    discoveryGoalsLoading,
    error,
    goalTaskIds,
    goalsLoading,
    handleSprintChange,
    loading,
    productTenant,
    reloadTasksMutation,
    selectedBoardId,
    selectedSprintId,
    setSelectedBoardId,
    setSelectedSprintId,
    showFullScreenLoading,
    sprintInfo,
    sprints,
    sprintsLoading,
    tasks,
    tasksPending,
  } = useMainPageClientData({
    activeTab,
    boardsLoading,
    boardSwitchPending: isBoardSwitchPending,
    getBoardById,
    isMounted,
    isPlannerDeepLink,
    pathname,
    plannerBoardId,
    plannerDeepLinkKey,
    plannerSprintId,
    router,
    searchParamsKey,
    t,
  });

  const boardName = useMemo(
    () => getBoardSelectorLabel(selectedBoardId),
    [selectedBoardId, getBoardSelectorLabel]
  );

  const adminHref = useMemo(() => {
    const adminOrg =
      productTenant.activeOrganization?.canAccessAdmin
        ? productTenant.activeOrganization
        : productTenant.organizations.find((o) => o.canAccessAdmin);
    if (adminOrg) {
      return '/admin/org';
    }
    if (productTenant.activeOrganization || productTenant.organizations.length > 0) {
      return '/admin/tracker';
    }
    return null;
  }, [productTenant.activeOrganization, productTenant.organizations]);

  const handleTabChange = useCallback(
    (tab: SprintTab) => {
      setQueryStates({ tab });
    },
    [setQueryStates]
  );

  const handleTasksReload = (options?: { showToast?: boolean }) => {
    reloadTasksMutation.mutate(options);
  };

  const handleGoalsUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sprintGoals'] });
  }, [queryClient]);

  const handleBoardChange = useCallback(async (boardId: number | null) => {
    if (!boardId) {
      setSelectedBoardId(null);
      router.push('/select-board');
      return;
    }

    if (boardId === selectedBoardId) {
      return;
    }

    setIsBoardSwitchPending(true);
    try {
      const sprintsData: SprintListItem[] = await queryClient.fetchQuery({
        queryFn: () => fetchSprints(boardId),
        queryKey: sprintsQueryKey(boardId),
        staleTime: SPRINTS_STALE_TIME_MS,
      });
      const sprintToSelect = pickSprintForBoardChange(sprintsData);

      setSelectedBoardId(boardId);
      setSelectedSprintId(sprintToSelect?.id ?? null);

      router.replace(
        buildBoardChangeReplacePath({
          boardId,
          searchParamsKey,
          sprintToSelect,
        }),
        { scroll: false }
      );
    } catch (err) {
      console.error('Error loading sprints:', err);
    } finally {
      setIsBoardSwitchPending(false);
    }
  }, [
    selectedBoardId,
    setSelectedBoardId,
    setSelectedSprintId,
    router,
    queryClient,
    searchParamsKey,
  ]);

  const plannerAccessDenied = computeMainPagePlannerAccessDenied({
    activeOrganizationCanUsePlanner: productTenant.activeOrganization?.canUsePlanner,
    activeOrganizationPresent: productTenant.activeOrganization != null,
    isMounted,
    sessionLoading: productTenant.sessionLoading,
    signedIn: productTenant.signedIn,
  });

  if (error) {
    return <MainPageClientErrorView error={error} t={t} />;
  }

  if (plannerAccessDenied) {
    return <MainPageClientAccessDeniedView t={t} />;
  }

  if (!selectedBoardId) {
    if (!isMounted || boardsLoading) {
      return <LoadingOverlay isVisible message={t('common.loading')} />;
    }
    return <MainPageClientRedirectingView t={t} />;
  }

  return (
    <ErrorBoundary>
      <Snow />
      <PhaseCardColorSchemeProvider>
        <PlannerRemoteMediaProvider enabled={!showFullScreenLoading}>
          <PlannerOnboardingReplayBridge>
            <div className="flex flex-col h-screen overflow-hidden">
              <PageHeader
                activeTab={activeTab}
                adminHref={adminHref}
                boardName={boardName}
                selectedBoardId={selectedBoardId}
                onBoardChange={handleBoardChange}
                onTabChange={handleTabChange}
              />

              <MainPageClientContent
                activeTab={activeTab}
                checklistDone={checklistDone}
                checklistTotal={checklistTotal}
                deliveryChecklistItems={deliveryChecklistItems}
                deliveryGoalsLoading={deliveryGoalsLoading}
                discoveryChecklistItems={discoveryChecklistItems}
                discoveryGoalsLoading={discoveryGoalsLoading}
                goalTaskIds={goalTaskIds}
                goalsLoading={goalsLoading}
                isMounted={isMounted}
                loading={loading}
                reloadTasksPending={reloadTasksMutation.isPending}
                selectedBoardId={selectedBoardId}
                selectedSprintId={selectedSprintId}
                sprintInfo={sprintInfo}
                sprints={sprints}
                sprintsLoading={sprintsLoading}
                tasks={tasks}
                tasksPending={tasksPending}
                onGoalsUpdate={handleGoalsUpdate}
                onSprintChange={handleSprintChange}
                onTasksReload={handleTasksReload}
              />
            </div>
            <LoadingOverlay isVisible={showFullScreenLoading} message={t('common.loading')} />
          </PlannerOnboardingReplayBridge>
        </PlannerRemoteMediaProvider>
      </PhaseCardColorSchemeProvider>
    </ErrorBoundary>
  );
}

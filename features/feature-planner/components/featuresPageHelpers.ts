import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { createIssue } from '@/lib/api/issues';

type TranslateFn = (key: string) => string;

interface CreateFeaturePlannerEpicInput {
  router: AppRouterInstance;
  routerBasePath: string;
  selectedBoardId: number | null;
  t: TranslateFn;
  getQueueByBoardId: (boardId: number | null | undefined) => string | null | undefined;
}

export async function createFeaturePlannerEpic({
  selectedBoardId,
  getQueueByBoardId,
  t,
  router,
  routerBasePath,
}: CreateFeaturePlannerEpicInput): Promise<void> {
  if (!selectedBoardId) {
    console.error('Board ID is required to create epic');
    return;
  }

  const queue = getQueueByBoardId(selectedBoardId);
  if (!queue) {
    console.error('Queue not found for board:', selectedBoardId);
    return;
  }

  const result = await createIssue({
    summary: t('planning.featurePlanner.newEpicDefaultSummary'),
    queue,
    type: 'epic',
  });

  if (result.success && result.key) {
    router.push(`${routerBasePath}?page=features&epicId=${result.key}`);
    return;
  }

  console.error('Failed to create epic:', result.error);
}

import { NextRequest, NextResponse } from 'next/server';

import { invalidateCache } from '@/lib/cache';
import { buildWorkEstimatesFromBody } from '@/lib/issues/issueDetailRouteHelpers';
import { sprintIdsFromIssueSprint } from '@/lib/issues/issuesRouteHelpers';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { resolveParams } from '@/lib/nextjs-utils';
import { patchCachedSprintIssueEstimates } from '@/lib/trackerApi/sprintIssuesCache';
import { buildIssueWorkEstimatePatch } from '@/lib/trackerIntegration/buildIssueWorkPatch';
import { loadTrackerIntegrationForRequest } from '@/lib/trackerIntegration/loadIntegrationForRequest';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  try {
    const { issueKey } = await resolveParams(params);
    if (!issueKey) {
      return NextResponse.json({ error: 'issueKey is required' }, { status: 400 });
    }

    const body = await request.json();
    const estimates = buildWorkEstimatesFromBody(body);
    if (estimates instanceof NextResponse) {
      return estimates;
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const integration = await loadTrackerIntegrationForRequest(request);
    const patchBody = buildIssueWorkEstimatePatch(integration, estimates);

    // Получаем информацию о задаче для определения спринтов
    const issue = await issueTracker.getIssue(issueKey);
    const sprintIds = sprintIdsFromIssueSprint(issue?.sprint);

    // Обновляем задачу (имена полей — из интеграции или storyPoints / testPoints)
    await issueTracker.updateIssue(issueKey, patchBody);

    // Burndown + снимок задач спринта: search Tracker отстаёт, поэтому правим кэш,
    // а не force-refresh списка (иначе UI откатывает оптимистичную оценку).
    for (const sprintId of sprintIds) {
      invalidateCache.burndown(sprintId);
      patchCachedSprintIssueEstimates(sprintId, issueKey, estimates);
    }
    invalidateCache.issueChangelog(issueKey);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating issue work:', error);
    return NextResponse.json(
      { error: 'Failed to update issue work' },
      { status: 500 }
    );
  }
}

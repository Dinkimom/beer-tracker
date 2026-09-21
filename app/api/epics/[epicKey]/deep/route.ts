import type { Task } from '@/types';

import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { apiCache, cacheKeys } from '@/lib/cache';
import { resolveParams } from '@/lib/nextjs-utils';
import { fetchEpicDeepFromSnapshots } from '@/lib/snapshots';
import { mapTrackerIssueToTask } from '@/lib/trackerApi';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';

const EPIC_DEEP_CACHE_TTL = 3 * 60;

/** Ответ API: глубокая структура эпик → стори → задачи (задачи в формате Task). */
export interface EpicDeepApiResponse {
  epic: { id: string; key: string; summary: string } | null;
  stories: Array<{
    story: { id: string; key: string; summary: string };
    tasks: Task[];
  }>;
}

/**
 * GET /api/epics/[epicKey]/deep
 * Эпик + стори + задачи из issue_snapshots.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ epicKey: string }> | { epicKey: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;

    const { epicKey } = await resolveParams(params);

    if (!epicKey) {
      return NextResponse.json(
        { error: 'epicKey is required' },
        { status: 400 }
      );
    }

    const cacheKey = cacheKeys.epicDeepFromPg(organizationId, epicKey);
    const cached = apiCache.get<EpicDeepApiResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const [{ epic, stories }, integration] = await Promise.all([
      fetchEpicDeepFromSnapshots(organizationId, epicKey),
      loadTrackerIntegrationForOrganization(organizationId),
    ]);

    const response: EpicDeepApiResponse = {
      epic: epic
        ? { id: epic.id, key: epic.key, summary: epic.summary }
        : null,
      stories: stories.map(({ story, tasks }) => ({
        story: {
          id: story.id,
          key: story.key,
          summary: story.summary,
        },
        tasks: tasks.map((issue) => mapTrackerIssueToTask(issue, integration)),
      })),
    };

    apiCache.set(cacheKey, response, EPIC_DEEP_CACHE_TTL);

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, 'fetch epic deep structure');
  }
}

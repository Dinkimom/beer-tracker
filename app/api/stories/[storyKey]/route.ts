import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getRouteParam } from '@/lib/api-utils';
import { apiCache, cacheKeys } from '@/lib/cache';
import { mapIssueToStoryResponse } from '@/lib/mappers';
import { findIssueSnapshot } from '@/lib/snapshots';
import {
  StoryKeyParamSchema,
  formatValidationError,
  validateRequest,
} from '@/lib/validation';

const STORY_CACHE_TTL = 5 * 60;

/**
 * GET /api/stories/[storyKey]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> | { storyKey: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const organizationId = tenantResult.ctx.organizationId;

    const storyKey = await getRouteParam(params, 'storyKey');

    const validation = validateRequest(StoryKeyParamSchema, { storyKey });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const validStoryKey = validation.data.storyKey;

    const cacheKey = cacheKeys.storyFromPg(organizationId, validStoryKey);
    const cachedData = apiCache.get<{ story: unknown }>(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const row = await findIssueSnapshot(organizationId, validStoryKey);

    if (!row) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    const story = mapIssueToStoryResponse(row.payload);

    const responseData = { story };

    apiCache.set(cacheKey, responseData, STORY_CACHE_TTL);

    return NextResponse.json(responseData);
  } catch (error) {
    return handleApiError(error, 'fetch story');
  }
}

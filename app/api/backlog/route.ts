import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { loadBacklogForOrganization } from '@/lib/backlog/loadBacklogForOrganization';
import { apiCache, cacheKeys } from '@/lib/cache';
import {
  BacklogQuerySchema,
  formatValidationError,
  validateRequest,
} from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const rawParams = {
      boardId: searchParams.get('boardId'),
      page: searchParams.get('page') ?? undefined,
      perPage: searchParams.get('perPage') ?? undefined,
    };

    const validation = validateRequest(BacklogQuerySchema, rawParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { boardId, page, perPage } = validation.data;

    const boardIdNum = parseInt(boardId, 10);
    const pageNum = page;
    const perPageNum = perPage;

    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }

    const { organizationId } = tenantResult.ctx;

    const cacheKey = cacheKeys.backlogFromPg(
      organizationId,
      boardIdNum,
      pageNum,
      perPageNum
    );

    const cachedData = apiCache.get<Awaited<ReturnType<typeof loadBacklogForOrganization>>>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const responseData = await loadBacklogForOrganization(
      organizationId,
      boardIdNum,
      pageNum,
      perPageNum
    );

    apiCache.set(cacheKey, responseData, 60);

    return NextResponse.json(responseData);
  } catch (error) {
    return handleApiError(error, 'fetch backlog');
  }
}

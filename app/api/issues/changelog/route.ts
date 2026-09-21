import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import {
  fetchIssueChangelogCacheMap,
  issueChangelogBatchRecordFromCacheMap,
} from '@/lib/snapshots';
import { formatValidationError, validateRequest } from '@/lib/validation';

const BatchChangelogRequestSchema = z.object({
  issueKeys: z.array(z.string().min(1)).min(1).max(100),
});

/**
 * POST /api/issues/changelog
 * Body: { issueKeys: string[] }
 * Читает changelog + comments из issue_changelog_events (PostgreSQL).
 * Для ключей без строки в БД возвращает пустые массивы.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const body = await request.json();

    const validation = validateRequest(BatchChangelogRequestSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { issueKeys } = validation.data;

    const cacheMap = await fetchIssueChangelogCacheMap(organizationId, issueKeys);
    return NextResponse.json(issueChangelogBatchRecordFromCacheMap(issueKeys, cacheMap));
  } catch (error) {
    return handleApiError(error, 'fetch issues changelog batch');
  }
}

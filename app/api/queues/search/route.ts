import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { QueueSearchQuerySchema, formatValidationError, validateRequest } from '@/lib/validation';

/**
 * GET /api/queues/search?q={query}
 * Поиск очередей организации в Tracker по ключу или названию.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }

    const q = request.nextUrl.searchParams.get('q') ?? '';
    const validation = validateRequest(QueueSearchQuerySchema, { q });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    const queues = await issueTracker.searchQueues(validation.data.q);

    return NextResponse.json({
      items: queues.map((queue) => ({ key: queue.key, name: queue.name })),
    });
  } catch (error) {
    return handleApiError(error, 'search queues');
  }
}

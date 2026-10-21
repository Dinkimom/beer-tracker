import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { buildIssueSearchApiResponse } from '@/lib/issues/issueTrackerRouteJson';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration';
import { IssueSearchQuerySchema, formatValidationError, validateRequest } from '@/lib/validation';

/**
 * GET /api/issues/search?q={query}&boardId={boardId}
 * Поиск задач в трекере по ключу или названию; родителей (parentCandidates) — в рамках доски.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const q = request.nextUrl.searchParams.get('q') ?? '';
    const boardIdParam = request.nextUrl.searchParams.get('boardId');
    const parentCandidatesParam = request.nextUrl.searchParams.get('parentCandidates');
    const validation = validateRequest(IssueSearchQuerySchema, {
      q,
      boardId: boardIdParam,
      parentCandidates:
        parentCandidatesParam === '1' || parentCandidatesParam === 'true'
          ? parentCandidatesParam
          : undefined,
    });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { boardId } = validation.data;
    const parentCandidates = Boolean(validation.data.parentCandidates);
    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);

    const [issues, integration] = await Promise.all([
      // Быстрое добавление ищет по всему трекеру: задача может быть ещё не на доске.
      // Родителя (эпик) по-прежнему ищем в рамках доски.
      issueTracker.searchIssuesOnBoard(boardId, q, {
        anyBoard: !parentCandidates,
        parentCandidates,
      }),
      loadTrackerIntegrationForOrganization(organizationId),
    ]);

    const items = buildIssueSearchApiResponse(
      issues,
      issueTracker.mapIssueToTask,
      integration
    );

    return NextResponse.json(items);
  } catch (error) {
    return handleApiError(error, 'search issues');
  }
}

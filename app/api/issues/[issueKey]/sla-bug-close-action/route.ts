import { NextRequest } from 'next/server';

import { handleSlaBugCloseActionPost } from '@/lib/issues/slaBugCloseActionRouteHelpers';

/**
 * POST /api/issues/[issueKey]/sla-bug-close-action
 * Действия по сигналу «Закрыть P4»: тег (+ комментарий при отправке на согласование).
 */
export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueKey: string }> | { issueKey: string } }
) {
  return handleSlaBugCloseActionPost(request, params);
}

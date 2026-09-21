import { NextRequest } from 'next/server';

import { getSprintTimer, postSprintTimer } from '@/lib/sprints/sprintTimerRouteHelpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
): Promise<Response> {
  return getSprintTimer(request, params);
}

export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
): Promise<Response> {
  return postSprintTimer(request, params);
}

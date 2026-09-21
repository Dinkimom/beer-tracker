import { NextRequest } from 'next/server';

import { patchSprintStatus } from '@/lib/sprints/sprintStatusRouteHelpers';

export function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> | { sprintId: string } }
) {
  return patchSprintStatus(request, params);
}

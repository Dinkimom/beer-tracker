import type { NextRequest } from 'next/server';

import { getTrackerApiFromRequest } from '@/lib/api-tracker';
import { resolveTrackerSprintBoardId } from '@/lib/trackerApi';

export function resolveNotificationBoardIdFromRequest(request: NextRequest, sprintId: number) {
  return async (): Promise<number | undefined> => {
    try {
      const trackerApi = await getTrackerApiFromRequest(request);
      return resolveTrackerSprintBoardId(sprintId, trackerApi);
    } catch {
      return undefined;
    }
  };
}

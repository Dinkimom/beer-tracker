import { NextRequest } from 'next/server';

import { createSprintRealtimeSseResponse } from '@/lib/realtime/sprintRealtimeSse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: NextRequest): Promise<Response> {
  return createSprintRealtimeSseResponse(request);
}

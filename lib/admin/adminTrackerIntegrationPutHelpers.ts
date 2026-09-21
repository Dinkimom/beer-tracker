import { NextResponse } from 'next/server';

import { parseJsonRequestBody } from '@/lib/http/parseJsonRequestBody';
import { parseTrackerIntegrationPutBody as parseTrackerIntegrationPutBodyRaw } from '@/lib/trackerIntegration/schema';

function cloneJsonWithoutConfigRevision(json: unknown): Record<string, unknown> {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return {};
  }
  const raw = { ...(json as Record<string, unknown>) };
  delete raw.configRevision;
  return raw;
}

export async function parseTrackerIntegrationPutBody(
  request: Request
): Promise<NextResponse | Record<string, unknown>> {
  const json = await parseJsonRequestBody(request);
  if (json instanceof NextResponse) {
    return json;
  }
  try {
    return parseTrackerIntegrationPutBodyRaw(cloneJsonWithoutConfigRevision(json));
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Некорректная конфигурация',
        issues: [{ message: error instanceof Error ? error.message : 'Invalid body' }],
      },
      { status: 400 }
    );
  }
}

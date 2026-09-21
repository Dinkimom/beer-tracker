import { NextResponse } from 'next/server';

export { parseSprintIdsCsv } from '@/lib/sprints';

export function parseSprintStatusPatch(body: { status?: string; version?: number }) {
  const validStatuses = ['draft', 'in_progress', 'released', 'archived'] as const;
  if (!body.status || !validStatuses.includes(body.status as (typeof validStatuses)[number])) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    );
  }
  return { status: body.status as (typeof validStatuses)[number], version: body.version };
}

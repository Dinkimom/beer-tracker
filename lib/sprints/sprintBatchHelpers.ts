import { NextResponse } from 'next/server';

export function parseSprintIdsCsv(sprintIdsStr: string | null): number[] {
  if (!sprintIdsStr) {
    return [];
  }
  return sprintIdsStr
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export function parseRequiredSprintIdsParam(
  sprintIdsStr: string | null
): NextResponse | number[] {
  if (!sprintIdsStr) {
    return NextResponse.json(
      { error: 'sprintIds is required (comma-separated)' },
      { status: 400 }
    );
  }
  return parseSprintIdsCsv(sprintIdsStr);
}

export function groupRowsBySprintId<T extends { sprint_id: number }>(
  sprintIds: number[],
  rows: T[]
): Record<number, Omit<T, 'sprint_id'>[]> {
  const bySprint: Record<number, Omit<T, 'sprint_id'>[]> = {};
  for (const id of sprintIds) {
    bySprint[id] = [];
  }
  for (const row of rows) {
    const { sprint_id, ...rest } = row;
    if (!bySprint[sprint_id]) {
      bySprint[sprint_id] = [];
    }
    bySprint[sprint_id].push(rest);
  }
  return bySprint;
}

export function buildBatchLinksResponse(
  sprintIds: number[],
  bySprint: Record<number, unknown[]>
): { bySprint: Array<{ links: unknown[]; sprintId: number }> } {
  return {
    bySprint: sprintIds.map((id) => ({ sprintId: id, links: bySprint[id] ?? [] })),
  };
}

import type { TenantContext } from '@/lib/api-tenant';

import { NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';

/** Id спринта из пути: только положительное целое (`12abc`, `0`, `-1` — нет). */
export function parseSprintIdParam(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) {
    return null;
  }
  const sprintId = Number(raw);
  return Number.isSafeInteger(sprintId) && sprintId > 0 ? sprintId : null;
}

type SprintRouteParams = Record<string, string> & { sprintId: string };

type SprintRouteContextResult<T extends SprintRouteParams> =
  | { ctx: TenantContext; params: T; sprintId: number }
  | { response: NextResponse };

/**
 * Начало роутов `/api/sprints/[sprintId]/…`: tenant планера, затем id спринта из пути (400, если кривой).
 * `params` — остальные сегменты пути (`commentId`, `linkId`), их роут проверяет сам.
 */
export async function requireSprintRouteContext<T extends SprintRouteParams>(
  request: Request,
  params: Promise<T> | T,
  tenant?: { ctx: TenantContext } | { response: NextResponse }
): Promise<SprintRouteContextResult<T>> {
  const tenantResult = tenant ?? (await requireTenantContext(request));
  if (!('ctx' in tenantResult)) {
    return { response: tenantResult.response };
  }
  const resolved = await resolveParams(params);
  const sprintId = parseSprintIdParam(resolved.sprintId);
  if (sprintId == null) {
    return { response: NextResponse.json({ error: 'Invalid sprint ID' }, { status: 400 }) };
  }
  return { ctx: tenantResult.ctx, params: resolved, sprintId };
}

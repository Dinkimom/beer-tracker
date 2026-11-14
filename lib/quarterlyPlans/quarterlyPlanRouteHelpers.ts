/**
 * Общий вход роутов квартального плана (`app/api/quarterly-plans/**`): участник организации и квартал
 * из `?year=&quarter=` или из тела запроса.
 */

import type { QuarterRef } from './quarterlyPlanTypes';
import type { TenantContext } from '@/lib/api-tenant';
import type { z } from 'zod';

import { NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';

import { QuarterRefSchema } from './quarterlyPlanContentParse';

type QuarterRouteResult<T> = { ctx: TenantContext; input: T } | { response: NextResponse };

/** Квартал из query: `?year=&quarter=`. */
export async function requireQuarterQuery(request: Request): Promise<QuarterRouteResult<QuarterRef>> {
  const tenantResult = await requireTenantContext(request);
  if (!('ctx' in tenantResult)) return { response: tenantResult.response };
  const ref = QuarterRefSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!ref.success) return { response: NextResponse.json({ error: 'year and quarter are required' }, { status: 400 }) };
  return { ctx: tenantResult.ctx, input: ref.data };
}

/** Квартал и остальные поля из тела запроса по схеме `schema` (расширение `QuarterRefSchema`). */
export async function requireQuarterBody<S extends z.ZodType>(
  request: Request,
  schema: S,
  error: string
): Promise<QuarterRouteResult<z.infer<S>>> {
  const tenantResult = await requireTenantContext(request);
  if (!('ctx' in tenantResult)) return { response: tenantResult.response };
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return { response: NextResponse.json({ error }, { status: 400 }) };
  return { ctx: tenantResult.ctx, input: body.data };
}

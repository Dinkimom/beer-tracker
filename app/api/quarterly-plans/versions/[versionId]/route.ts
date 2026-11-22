import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError } from '@/lib/api-error-handler';
import { resolveParams } from '@/lib/nextjs-utils';
import { QuarterRefSchema } from '@/lib/quarterlyPlans/quarterlyPlanContentParse';
import { requireQuarterBody, requireQuarterQuery } from '@/lib/quarterlyPlans/quarterlyPlanRouteHelpers';
import { loadQuarterlyPlanVersion, restoreQuarterlyPlanVersion } from '@/lib/quarterlyPlans/quarterlyPlanService';
import { notifyQuarterRealtime } from '@/lib/realtime/quarterRealtime';

interface Params {
  params: Promise<{ versionId: string }> | { versionId: string };
}

const VersionIdSchema = z.string().uuid();
const RestoreSchema = QuarterRefSchema.extend({ ifVersion: z.number().int().min(0) });

async function versionIdOf(params: Params['params']): Promise<string | null> {
  const parsed = VersionIdSchema.safeParse((await resolveParams(params)).versionId);
  return parsed.success ? parsed.data : null;
}

/** GET /api/quarterly-plans/versions/:id?year=&quarter= — версия и та, что перед ней: доска показывает её изменения (QH4). */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const route = await requireQuarterQuery(request);
    if ('response' in route) return route.response;
    const versionId = await versionIdOf(params);
    if (!versionId) return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    const version = await loadQuarterlyPlanVersion({ organizationId: route.ctx.organizationId, ref: route.input, versionId });
    if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    return NextResponse.json(version);
  } catch (error) {
    return handleApiError(error, 'fetch quarterly plan version');
  }
}

/** POST /api/quarterly-plans/versions/:id — откатить план к версии поверх `ifVersion` (QH5); чужое сохранение — 409. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const route = await requireQuarterBody(request, RestoreSchema, 'year, quarter and ifVersion are required');
    if ('response' in route) return route.response;
    const versionId = await versionIdOf(params);
    if (!versionId) return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    const { ifVersion, quarter, year } = route.input;
    const result = await restoreQuarterlyPlanVersion({
      authorId: route.ctx.userId,
      ifVersion,
      organizationId: route.ctx.organizationId,
      ref: { quarter, year },
      versionId,
    });
    if (result.status === 'not_found') return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    if (result.status === 'invalid') return NextResponse.json({ error: result.error }, { status: 422 });
    if (result.status === 'conflict') return NextResponse.json({ error: 'The plan changed, try again' }, { status: 409 });
    notifyQuarterRealtime(request, { organizationId: route.ctx.organizationId, quarter, year });
    return NextResponse.json({ content: result.content, version: result.version });
  } catch (error) {
    return handleApiError(error, 'restore quarterly plan version');
  }
}

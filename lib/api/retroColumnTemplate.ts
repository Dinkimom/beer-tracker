import type { RetroColumn } from '@/lib/retro/retroBoardShared';

import { adminOrgApiPath } from '@/lib/api/admin/paths';
import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';
import { defaultRetroColumnTemplate, parseRetroColumnTemplate } from '@/lib/retro/retroBoard';

interface RetroColumnTemplateResponse {
  columns: RetroColumn[];
  updatedAt: string | null;
}

function readUpdatedAt(raw: unknown): string | null {
  if (raw === null || typeof raw !== 'object' || !('updatedAt' in raw)) return null;
  return typeof raw.updatedAt === 'string' ? raw.updatedAt : null;
}

function readTemplate(raw: unknown): RetroColumnTemplateResponse {
  return {
    columns: parseRetroColumnTemplate(raw) ?? defaultRetroColumnTemplate(),
    updatedAt: readUpdatedAt(raw),
  };
}

export async function fetchRetroColumnTemplate(organizationId: string): Promise<RetroColumn[]> {
  const { data } = await getPlannerBeerTrackerApi().get<unknown>(
    `/organizations/${organizationId}/retro-template`
  );
  return readTemplate(data).columns;
}

export async function fetchAdminRetroColumnTemplate(
  organizationId: string
): Promise<RetroColumnTemplateResponse> {
  const { data } = await getPlannerBeerTrackerApi().get<unknown>(
    adminOrgApiPath(organizationId, 'retro-template')
  );
  return readTemplate(data);
}

export async function saveAdminRetroColumnTemplate(
  organizationId: string,
  columns: readonly RetroColumn[]
): Promise<RetroColumnTemplateResponse> {
  const { data } = await getPlannerBeerTrackerApi().put<unknown>(
    adminOrgApiPath(organizationId, 'retro-template'),
    { columns }
  );
  return readTemplate(data);
}

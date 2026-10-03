import type { RetroColumn } from './retroBoardShared';

import { query } from '@/lib/db';

import { defaultRetroColumnTemplate, parseRetroColumnTemplate } from './retroBoard';

interface RetroColumnTemplateRecord {
  columns: RetroColumn[];
  updatedAt: string | null;
}

export async function readRetroColumnTemplate(organizationId: string): Promise<RetroColumnTemplateRecord> {
  const result = await query<{ columns: unknown; updated_at: Date }>(
    `SELECT columns, updated_at FROM retro_column_templates WHERE organization_id = $1`,
    [organizationId]
  );
  const row = result.rows[0];
  if (!row) return { columns: defaultRetroColumnTemplate(), updatedAt: null };
  return {
    columns: parseRetroColumnTemplate(row.columns) ?? defaultRetroColumnTemplate(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function saveRetroColumnTemplate(
  organizationId: string,
  rawColumns: unknown
): Promise<RetroColumnTemplateRecord | null> {
  const columns = parseRetroColumnTemplate(rawColumns);
  if (!columns) return null;
  const result = await query<{ updated_at: Date }>(
    `INSERT INTO retro_column_templates (organization_id, columns)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (organization_id)
     DO UPDATE SET columns = EXCLUDED.columns
     RETURNING updated_at`,
    [organizationId, JSON.stringify(columns)]
  );
  const updatedAt = result.rows[0]?.updated_at;
  if (!updatedAt) return null;
  return { columns, updatedAt: updatedAt.toISOString() };
}

import type { QuarterlyPlanContent, QuarterRef } from './quarterlyPlanTypes';

import { query } from '@/lib/db';

interface StoredQuarterlyPlan {
  content: QuarterlyPlanContent;
  /** Номер сохранения; 0 — плана в базе ещё нет. */
  version: number;
}

const EMPTY_CONTENT: QuarterlyPlanContent = { assignments: [], directions: [], epics: [], links: [], notes: [] };

/** Содержимое плана квартала как оно лежит в базе; квартал без плана — пустой, версия 0 (QS4). */
export async function fetchQuarterlyPlanContent(
  organizationId: string,
  { quarter, year }: QuarterRef
): Promise<StoredQuarterlyPlan> {
  const result = await query<{ content: QuarterlyPlanContent; version: number }>(
    `SELECT content, version FROM org_quarterly_plans
     WHERE organization_id = $1 AND year = $2 AND quarter = $3`,
    [organizationId, year, quarter]
  );
  const row = result.rows[0];
  return row ? { content: { ...EMPTY_CONTENT, ...row.content }, version: row.version } : { content: EMPTY_CONTENT, version: 0 };
}

/**
 * Сохраняет план, если в базе всё ещё версия `ifVersion` (QS5). Возвращает новую версию
 * или null — план уже сохранил кто-то другой. `ifVersion` 0 — плана ещё нет, создаём.
 */
export async function saveQuarterlyPlanContent(input: {
  content: QuarterlyPlanContent;
  ifVersion: number;
  organizationId: string;
  ref: QuarterRef;
}): Promise<number | null> {
  const { content, ifVersion, organizationId, ref } = input;
  const json = JSON.stringify(content);
  const result =
    ifVersion === 0
      ? await query<{ version: number }>(
          `INSERT INTO org_quarterly_plans (organization_id, year, quarter, content)
           VALUES ($1, $2, $3, $4::jsonb)
           ON CONFLICT (organization_id, year, quarter) DO NOTHING
           RETURNING version`,
          [organizationId, ref.year, ref.quarter, json]
        )
      : await query<{ version: number }>(
          `UPDATE org_quarterly_plans
           SET content = $4::jsonb, version = version + 1, updated_at = CURRENT_TIMESTAMP
           WHERE organization_id = $1 AND year = $2 AND quarter = $3 AND version = $5
           RETURNING version`,
          [organizationId, ref.year, ref.quarter, json, ifVersion]
        );
  return result.rows[0]?.version ?? null;
}

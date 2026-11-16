/**
 * Версии квартального плана в базе (`org_quarterly_plan_versions`): снимок содержимого на каждое сохранение,
 * правки одного человека подряд — одна строка (QH1, QH2).
 */

import type { QuarterlyPlanContent, QuarterRef } from './quarterlyPlanTypes';
import type { QuarterlyPlanVersionSource } from './quarterlyPlanVersions';

import { STAFF_AUTHOR_DISPLAY_NAME_SQL } from '@/lib/comments/commentAuthor';
import { query } from '@/lib/db';

const PLAN_WHERE = 'organization_id = $1 AND year = $2 AND quarter = $3';

function planParams(organizationId: string, { quarter, year }: QuarterRef): [string, number, number] {
  return [organizationId, year, quarter];
}

interface LatestVersionRow {
  author_id: string | null;
  id: string;
  source: QuarterlyPlanVersionSource;
  updated_at: Date;
}

/** Последняя версия плана — с ней склеивается следующая правка того же человека. */
export async function fetchLatestQuarterlyPlanVersion(
  organizationId: string,
  ref: QuarterRef
): Promise<{ authorId: string | null; id: string; source: QuarterlyPlanVersionSource; updatedAt: Date } | null> {
  const result = await query<LatestVersionRow>(
    `SELECT id::text AS id, author_id, source, updated_at FROM org_quarterly_plan_versions
     WHERE ${PLAN_WHERE} ORDER BY created_at DESC LIMIT 1`,
    planParams(organizationId, ref)
  );
  const row = result.rows[0];
  return row ? { authorId: row.author_id, id: row.id, source: row.source, updatedAt: new Date(row.updated_at) } : null;
}

/**
 * План до начала истории — версией-основой (QH1): у плана, сохранённого до появления истории, первая правка
 * иначе не с чем сравнить. Есть хоть одна версия или плана нет — ничего не пишет.
 */
export async function ensureQuarterlyPlanBaselineVersion(organizationId: string, ref: QuarterRef): Promise<void> {
  await query(
    `INSERT INTO org_quarterly_plan_versions (organization_id, year, quarter, plan_version, content, source, created_at, updated_at)
     SELECT organization_id, year, quarter, version, content, 'baseline', updated_at, updated_at
       FROM org_quarterly_plans
      WHERE ${PLAN_WHERE}
        AND NOT EXISTS (SELECT 1 FROM org_quarterly_plan_versions WHERE ${PLAN_WHERE})`,
    planParams(organizationId, ref)
  );
}

export async function insertQuarterlyPlanVersion(input: {
  authorId: string;
  content: QuarterlyPlanContent;
  organizationId: string;
  planVersion: number;
  ref: QuarterRef;
  source: QuarterlyPlanVersionSource;
}): Promise<void> {
  await query(
    `INSERT INTO org_quarterly_plan_versions (organization_id, year, quarter, plan_version, content, author_id, source)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
    [...planParams(input.organizationId, input.ref), input.planVersion, JSON.stringify(input.content), input.authorId, input.source]
  );
}

/** Правка склеилась с последней версией (QH2): её содержимое и время — новые. */
export async function updateQuarterlyPlanVersion(input: {
  content: QuarterlyPlanContent;
  id: string;
  planVersion: number;
}): Promise<void> {
  await query(
    `UPDATE org_quarterly_plan_versions
        SET content = $2::jsonb, plan_version = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::uuid`,
    [input.id, JSON.stringify(input.content), input.planVersion]
  );
}

interface StoredQuarterlyPlanVersion {
  authorName: string | null;
  content: QuarterlyPlanContent;
  createdAt: string;
  id: string;
  planVersion: number;
  source: QuarterlyPlanVersionSource;
  updatedAt: string;
}

interface VersionRow {
  author_name: string | null;
  content: QuarterlyPlanContent;
  created_at: Date;
  id: string;
  plan_version: number;
  source: QuarterlyPlanVersionSource;
  updated_at: Date;
}

const VERSION_COLUMNS = `v.id::text AS id, v.plan_version, v.content, v.source, v.created_at, v.updated_at,
       ${STAFF_AUTHOR_DISPLAY_NAME_SQL} AS author_name`;
const VERSION_FROM = `org_quarterly_plan_versions v LEFT JOIN staff s ON s.id::text = v.author_id`;

function versionFromRow(row: VersionRow): StoredQuarterlyPlanVersion {
  return {
    authorName: row.author_name,
    content: row.content,
    createdAt: new Date(row.created_at).toISOString(),
    id: row.id,
    planVersion: row.plan_version,
    source: row.source,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Версии плана, новые первыми; `limit` — сколько последних. */
export async function listQuarterlyPlanVersions(
  organizationId: string,
  ref: QuarterRef,
  limit: number
): Promise<StoredQuarterlyPlanVersion[]> {
  const result = await query<VersionRow>(
    `SELECT ${VERSION_COLUMNS} FROM ${VERSION_FROM}
      WHERE v.organization_id = $1 AND v.year = $2 AND v.quarter = $3
      ORDER BY v.created_at DESC LIMIT $4`,
    [...planParams(organizationId, ref), limit]
  );
  return result.rows.map(versionFromRow);
}

/** Версия и та, что была перед ней (по ней версия показывает свои изменения); версии нет — null. */
export async function fetchQuarterlyPlanVersionWithPrevious(
  organizationId: string,
  ref: QuarterRef,
  versionId: string
): Promise<{ previous: StoredQuarterlyPlanVersion | null; version: StoredQuarterlyPlanVersion } | null> {
  const result = await query<VersionRow>(
    `WITH target AS (
       SELECT created_at FROM org_quarterly_plan_versions
        WHERE organization_id = $1 AND year = $2 AND quarter = $3 AND id = $4::uuid
     )
     SELECT ${VERSION_COLUMNS} FROM ${VERSION_FROM}, target
      WHERE v.organization_id = $1 AND v.year = $2 AND v.quarter = $3 AND v.created_at <= target.created_at
      ORDER BY v.created_at DESC LIMIT 2`,
    [...planParams(organizationId, ref), versionId]
  );
  const [version, previous] = result.rows.map(versionFromRow);
  if (!version || version.id !== versionId) return null;
  return { previous: previous ?? null, version };
}

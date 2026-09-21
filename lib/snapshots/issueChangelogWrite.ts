/**
 * Кеш changelog + comments в issue_changelog_events (одна строка на задачу).
 */

import type { IssueChangelogCacheRow } from './types';
import type { IssueChangelogWithComments } from '@/types/tracker';

import { query } from '@/lib/db';

import { stringifyForPostgresJsonb } from './sanitizePayloadForPostgresJsonb';

interface ChangelogUpsertRow {
  changelog: unknown;
  comments: unknown;
  issue_key: string;
  organization_id: string;
  synced_at: Date | string;
}

function mapCacheRow(r: ChangelogUpsertRow): IssueChangelogCacheRow {
  return {
    organization_id: r.organization_id,
    issue_key: r.issue_key,
    changelog: Array.isArray(r.changelog) ? r.changelog : [],
    comments: Array.isArray(r.comments) ? r.comments : [],
    synced_at:
      typeof r.synced_at === 'string'
        ? r.synced_at
        : r.synced_at.toISOString(),
  };
}

export async function upsertIssueChangelogCacheRow(
  organizationId: string,
  issueKey: string,
  data: IssueChangelogWithComments
): Promise<IssueChangelogCacheRow> {
  const res = await query<ChangelogUpsertRow>(
    `INSERT INTO issue_changelog_events (organization_id, issue_key, changelog, comments)
     VALUES ($1, $2, $3::jsonb, $4::jsonb)
     ON CONFLICT (organization_id, issue_key) DO UPDATE
     SET changelog = EXCLUDED.changelog,
         comments = EXCLUDED.comments,
         synced_at = CURRENT_TIMESTAMP
     RETURNING organization_id, issue_key, changelog, comments, synced_at`,
    [
      organizationId,
      issueKey,
      stringifyForPostgresJsonb(data.changelog),
      stringifyForPostgresJsonb(data.comments),
    ]
  );
  const row = res.rows[0];
  if (!row) {
    throw new Error('upsertIssueChangelogCacheRow: UPSERT returned no row');
  }
  return mapCacheRow(row);
}

export async function upsertIssueChangelogCacheBatchForOrg(
  organizationId: string,
  rows: Array<{ data: IssueChangelogWithComments; issueKey: string }>
): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await upsertIssueChangelogCacheRow(organizationId, r.issueKey, r.data);
    n += 1;
  }
  return n;
}

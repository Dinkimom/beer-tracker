import type {
  IssueLinkDirection,
  IssueLinkRelationship,
  IssueTrackerIssueLink,
} from '@/lib/issueTrackerProvider/issueLinkTypes';

import { query, runBeerTrackerTransaction } from '@/lib/db';
import { isIssueLinkRelationship } from '@/lib/issueTrackerProvider/issueLinkTypes';

interface IssueLinkRow {
  direction: IssueLinkDirection;
  issueKey: string;
  linkedIssueKey: string;
  linkedStatus: string | null;
  linkedSummary: string | null;
  relationship: IssueLinkRelationship;
  syncedAt: string;
  trackerLinkId: string;
}

function mapRow(row: {
  direction: string;
  issue_key: string;
  linked_issue_key: string;
  linked_status: string | null;
  linked_summary: string | null;
  relationship: string;
  synced_at: Date | string;
  tracker_link_id: string;
}): IssueLinkRow | null {
  if (!isIssueLinkRelationship(row.relationship)) {
    return null;
  }
  const direction: IssueLinkDirection =
    row.direction === 'inward' ? 'inward' : 'outward';
  return {
    direction,
    issueKey: row.issue_key,
    linkedIssueKey: row.linked_issue_key,
    linkedStatus: row.linked_status,
    linkedSummary: row.linked_summary,
    relationship: row.relationship,
    syncedAt:
      row.synced_at instanceof Date ? row.synced_at.toISOString() : String(row.synced_at),
    trackerLinkId: row.tracker_link_id,
  };
}

export function issueLinkRowToDto(row: IssueLinkRow): IssueTrackerIssueLink {
  return {
    id: row.trackerLinkId,
    direction: row.direction,
    relationship: row.relationship,
    linkedIssueKey: row.linkedIssueKey,
    linkedSummary: row.linkedSummary,
    linkedStatus: row.linkedStatus,
  };
}

export async function listIssueLinksForIssue(input: {
  issueKey: string;
  organizationId: string;
}): Promise<IssueLinkRow[]> {
  const result = await query(
    `SELECT
        tracker_link_id,
        issue_key,
        linked_issue_key,
        relationship,
        direction,
        linked_summary,
        linked_status,
        synced_at
      FROM issue_links
      WHERE organization_id = $1 AND issue_key = $2
      ORDER BY relationship, linked_issue_key`,
    [input.organizationId, input.issueKey]
  );
  const out: IssueLinkRow[] = [];
  for (const row of result.rows) {
    const mapped = mapRow(row as Parameters<typeof mapRow>[0]);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

export async function replaceIssueLinksForIssue(input: {
  issueKey: string;
  links: IssueTrackerIssueLink[];
  organizationId: string;
}): Promise<IssueLinkRow[]> {
  await runBeerTrackerTransaction(async (run) => {
    await run('DELETE FROM issue_links WHERE organization_id = $1 AND issue_key = $2', [
      input.organizationId,
      input.issueKey,
    ]);

    for (const link of input.links) {
      if (!link.id) {
        continue;
      }
      await run(
        `INSERT INTO issue_links (
            organization_id,
            issue_key,
            tracker_link_id,
            linked_issue_key,
            relationship,
            direction,
            linked_summary,
            linked_status,
            synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          input.organizationId,
          input.issueKey,
          link.id,
          link.linkedIssueKey,
          link.relationship,
          link.direction,
          link.linkedSummary ?? null,
          link.linkedStatus ?? null,
        ]
      );
    }
  });

  return listIssueLinksForIssue({
    organizationId: input.organizationId,
    issueKey: input.issueKey,
  });
}

export async function upsertIssueLink(input: {
  issueKey: string;
  link: IssueTrackerIssueLink;
  organizationId: string;
}): Promise<IssueLinkRow | null> {
  if (!input.link.id) {
    return null;
  }
  const result = await query(
    `INSERT INTO issue_links (
        organization_id,
        issue_key,
        tracker_link_id,
        linked_issue_key,
        relationship,
        direction,
        linked_summary,
        linked_status,
        synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (organization_id, issue_key, tracker_link_id)
      DO UPDATE SET
        linked_issue_key = EXCLUDED.linked_issue_key,
        relationship = EXCLUDED.relationship,
        direction = EXCLUDED.direction,
        linked_summary = EXCLUDED.linked_summary,
        linked_status = EXCLUDED.linked_status,
        synced_at = CURRENT_TIMESTAMP
      RETURNING
        tracker_link_id,
        issue_key,
        linked_issue_key,
        relationship,
        direction,
        linked_summary,
        linked_status,
        synced_at`,
    [
      input.organizationId,
      input.issueKey,
      input.link.id,
      input.link.linkedIssueKey,
      input.link.relationship,
      input.link.direction,
      input.link.linkedSummary ?? null,
      input.link.linkedStatus ?? null,
    ]
  );
  const row = result.rows[0] as Parameters<typeof mapRow>[0] | undefined;
  return row ? mapRow(row) : null;
}

export async function deleteIssueLinkByTrackerId(input: {
  issueKey: string;
  organizationId: string;
  trackerLinkId: string;
}): Promise<void> {
  await query(
    `DELETE FROM issue_links
      WHERE organization_id = $1 AND issue_key = $2 AND tracker_link_id = $3`,
    [input.organizationId, input.issueKey, input.trackerLinkId]
  );
}

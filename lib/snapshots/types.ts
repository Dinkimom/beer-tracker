/**
 * Строки таблиц issue_snapshots / issue_changelog_events (tenant-scoped).
 */

import type {
  ChangelogEntry,
  IssueComment,
  TrackerIssue,
} from '@/types/tracker';

export interface IssueSnapshotRow {
  issue_key: string;
  organization_id: string;
  /** Поля задачи Tracker (envelope `{ schemaVersion, provider, payload }` разворачивается при чтении). */
  payload: TrackerIssue;
  synced_at: string;
  tracker_updated_at: string | null;
}

/** Строка кеша changelog+comments (PRIMARY KEY organization_id + issue_key). */
export interface IssueChangelogCacheRow {
  changelog: ChangelogEntry[];
  comments: IssueComment[];
  issue_key: string;
  organization_id: string;
  synced_at: string;
}

export interface QueryBacklogSnapshotsParams {
  /** Исключаемые `status.key`; по умолчанию closed. */
  excludeStatusKeys?: string[];
  /** Разрешённые `type.key`; по умолчанию: task, bug. */
  issueTypeKeys?: string[];
  /** Только задачи без активного спринта в payload. */
  onlyWithoutSprint?: boolean;
  /** Нумерация страниц с 1. */
  page?: number;
  perPage?: number;
  /** Если задан — фильтр по queue в payload (key/id или плоское поле). */
  trackerQueueKey?: string | null;
}

export interface QueryBacklogSnapshotsResult {
  rows: IssueSnapshotRow[];
  totalCount: number;
  totalPages: number;
}

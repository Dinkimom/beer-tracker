'use client';

import type { AdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';

import {
  describeStatsCheckpoint,
  describeSyncProgressMeta,
  redisJobStateLabel,
} from '@/lib/sync/syncProgressForAdmin';

import {
  resolveHeavyDisplayJob,
  resolveRunningStats,
} from './adminSyncProgressPanelHelpers';

type Translate = (key: string) => string;
type HasKey = (key: string) => boolean;

interface AdminSyncProgressJobSectionProps {
  detailLine: string | null;
  displayJob: NonNullable<ReturnType<typeof resolveHeavyDisplayJob>>;
  has: HasKey;
  jobActive: boolean;
  pct: number;
  t: Translate;
}

export function AdminSyncProgressJobSection({
  displayJob,
  jobActive,
  pct,
  detailLine,
  t,
  has,
}: AdminSyncProgressJobSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-mono">{displayJob.name}</span>
        <span className="uppercase tracking-wide">{redisJobStateLabel(displayJob.state, t, has)}</span>
      </div>
      {jobActive ? (
        <div
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(pct)}
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-300 dark:bg-blue-500"
            style={{ width: `${String(pct)}%` }}
          />
        </div>
      ) : null}
      {!jobActive && displayJob.state === 'waiting' ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.syncPage.jobWaitingHint')}</p>
      ) : null}
      {detailLine ? <p className="text-sm text-gray-800 dark:text-gray-200">{detailLine}</p> : null}
    </div>
  );
}

export function resolveAdminSyncProgressView(syncView: AdminSyncStatusPayload, t: Translate) {
  const displayJob = resolveHeavyDisplayJob(syncView);
  const runningStats = resolveRunningStats(syncView);
  const lineJob = displayJob ? describeSyncProgressMeta(displayJob.progressMeta, t) : null;
  const lineDb = describeStatsCheckpoint(runningStats, t);
  return {
    detailLine: lineJob ?? lineDb,
    displayJob,
    hasRunning: syncView.runningSyncRun != null,
    jobActive: displayJob?.state === 'active',
    pct: Math.min(100, Math.max(0, displayJob?.progress ?? 0)),
  };
}

export type AdminSyncProgressView = ReturnType<typeof resolveAdminSyncProgressView>;

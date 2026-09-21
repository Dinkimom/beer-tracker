'use client';

import type { AdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';

import { formatAdminDateTime } from '@/features/admin/adminFormatters';
import {
  formatSyncJobType,
  formatSyncRunStatus,
  syncRunStatusWordClass,
} from '@/features/admin/adminSyncDisplay';

type AdminSyncLastRun = NonNullable<AdminSyncStatusPayload['lastSyncRun']>;

export function AdminSyncLastSyncRunLine({
  has,
  run,
  t,
}: {
  has: (key: string) => boolean;
  run: AdminSyncLastRun;
  t: (key: string, params?: Record<string, number | string>) => string;
}) {
  const jobLabel = formatSyncJobType(run.jobType, t, has);
  return (
    <li>
      {t('admin.syncPage.lastRunPrefix')}{' '}
      <span className={syncRunStatusWordClass(run.status)}>{formatSyncRunStatus(run.status, t, has)}</span>
      {jobLabel ? (
        <>
          {' · '}
          <span className="text-gray-700 dark:text-gray-300">{jobLabel}</span>
        </>
      ) : null}
      {', '}
      {formatAdminDateTime(run.startedAt)}
      {run.finishedAt ? ` — ${formatAdminDateTime(run.finishedAt)}` : ''}
      {run.errorSummary ? (
        <span className="mt-0.5 block text-red-600 dark:text-red-400">{run.errorSummary}</span>
      ) : null}
    </li>
  );
}

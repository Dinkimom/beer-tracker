'use client';

import { AdminSyncProgressJobSection, type AdminSyncProgressView } from './AdminSyncProgressPanelSections';
import { AdminSyncProgressRunningSection } from './AdminSyncProgressRunningSection';

export function AdminSyncProgressPanelBody({
  has,
  mutedClass,
  progressView,
  t,
  workerMaybeMissing,
  workerMissingHint,
  progressTitle,
}: {
  has: (key: string) => boolean;
  mutedClass: string;
  progressTitle: string;
  progressView: AdminSyncProgressView;
  t: (key: string) => string;
  workerMaybeMissing: boolean;
  workerMissingHint: string;
}) {
  const panelShell =
    'space-y-3 rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20';

  return (
    <div className={panelShell}>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{progressTitle}</h3>
      {workerMaybeMissing ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">{workerMissingHint}</p>
      ) : null}
      {progressView.displayJob ? (
        <AdminSyncProgressJobSection
          detailLine={progressView.detailLine}
          displayJob={progressView.displayJob}
          has={has}
          jobActive={progressView.jobActive}
          pct={progressView.pct}
          t={t}
        />
      ) : null}
      {!progressView.displayJob && progressView.hasRunning ? (
        <AdminSyncProgressRunningSection
          detailLine={progressView.detailLine}
          mutedClass={mutedClass}
          t={t}
        />
      ) : null}
    </div>
  );
}

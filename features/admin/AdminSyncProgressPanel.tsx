'use client';

import type { AdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';

import { useI18n } from '@/contexts/LanguageContext';
import { AdminSyncProgressPanelBody } from '@/features/admin/AdminSyncProgressPanelBody';
import {
  resolveHeavyDisplayJob,
  resolveWaitingJobId,
} from '@/features/admin/adminSyncProgressPanelHelpers';
import { resolveAdminSyncProgressView } from '@/features/admin/AdminSyncProgressPanelSections';
import { useStaleWaitingHint } from '@/features/admin/adminSyncProgressPanelStaleHint';

export function AdminSyncProgressPanel({
  mutedClass,
  syncView,
}: {
  mutedClass: string;
  syncView: AdminSyncStatusPayload;
}) {
  const { has, t } = useI18n();
  const displayJob = resolveHeavyDisplayJob(syncView);
  const waitingJobId = resolveWaitingJobId(syncView, displayJob);
  const staleWaitingHint = useStaleWaitingHint(waitingJobId);
  const progressView = resolveAdminSyncProgressView(syncView, t);
  const workerMaybeMissing = staleWaitingHint && waitingJobId != null;
  const showPanel = workerMaybeMissing || displayJob != null || progressView.hasRunning;

  if (!showPanel) {
    return null;
  }

  return (
    <AdminSyncProgressPanelBody
      has={has}
      mutedClass={mutedClass}
      progressTitle={t('admin.syncPage.progressTitle')}
      progressView={progressView}
      t={t}
      workerMaybeMissing={workerMaybeMissing}
      workerMissingHint={t('admin.syncPage.workerMissingHint')}
    />
  );
}

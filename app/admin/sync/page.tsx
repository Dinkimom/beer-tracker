'use client';

import type { AdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';
import type { AxiosError } from 'axios';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { useAdminOrganizationId } from '@/features/admin/AdminOrganizationIdContext';
import { isAdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';
import { muted } from '@/features/admin/adminUiTokens';
import { AdminSyncSection } from '@/features/admin/components/AdminSyncSection';
import { useAdminTrackerConnectionReady } from '@/features/admin/hooks/useAdminTrackerConnectionReady';
import {
  fetchAdminSyncStatus,
  patchAdminSyncSettings,
  postAdminFullRescanSync,
  postAdminIncrementalSync,
} from '@/lib/api/admin/sync';
import { readApiErrorMessage, readApiErrorStatus } from '@/lib/api/readApiError';
import { translateIssueTrackerProviderMessage } from '@/lib/issueTrackerProvider/issueTrackerUi';

const EXPORTER_ENABLED = process.env.NEXT_PUBLIC_EXPORTER_ENABLED !== 'false';

export default function SyncPage() {
  const { t } = useI18n();
  const issueTrackerProviderKind = useIssueTrackerProviderKind();
  const { confirm, DialogComponent } = useConfirmDialog();
  const router = useRouter();
  const connectOrgId = useAdminOrganizationId();
  const { loading: trackerGateLoading, ready: trackerReady } =
    useAdminTrackerConnectionReady(connectOrgId);

  const [syncView, setSyncView] = useState<AdminSyncStatusPayload | null>(null);
  const [syncStatusLoading, setSyncStatusLoading] = useState(false);

  const [settingsDirty, setSettingsDirty] = useState(false);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formExtraQueueKeys, setFormExtraQueueKeys] = useState<string[]>([]);
  const [formIntervalMinutes, setFormIntervalMinutes] = useState('');
  const [formOverlapMinutes, setFormOverlapMinutes] = useState('');
  const [formMaxIssuesPerRun, setFormMaxIssuesPerRun] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    if (!syncView || settingsDirty) return;
    const r = syncView.resolvedSync;
    setFormEnabled(r.enabled);
    setFormExtraQueueKeys(r.extraQueueKeys);
    setFormIntervalMinutes(String(r.intervalMinutes));
    setFormOverlapMinutes(String(r.overlapMinutes));
    setFormMaxIssuesPerRun(String(r.maxIssuesPerRun));
  }, [syncView, settingsDirty]);

  useEffect(() => {
    if (EXPORTER_ENABLED) return;
    router.replace('/admin/teams');
  }, [router]);

  useEffect(() => {
    if (!connectOrgId || trackerGateLoading || trackerReady) return;
    router.replace('/admin/tracker');
  }, [connectOrgId, router, trackerGateLoading, trackerReady]);

  const loadSyncStatus = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!connectOrgId) return;
      const silent = opts?.silent === true;
      if (!silent) {
        setSyncStatusLoading(true);
      }
      try {
        const data = await fetchAdminSyncStatus(connectOrgId);
        if (!isAdminSyncStatusPayload(data)) {
          const msg = t('admin.sync.invalidStatusResponse');
          if (!silent) {
            toast.error(msg);
            setSyncView(null);
          }
          return;
        }
        setSyncView(data);
      } catch (error) {
        const msg = readApiErrorMessage(error, t('admin.sync.networkStatusError'));
        if (!silent) {
          toast.error(msg);
          setSyncView(null);
        }
      } finally {
        if (!silent) setSyncStatusLoading(false);
      }
    },
    [connectOrgId, t]
  );

  useEffect(() => {
    setSyncView(null);
    setSettingsDirty(false);
    if (!connectOrgId || trackerGateLoading || !trackerReady) return;
    void loadSyncStatus({ silent: false });
    const id = setInterval(() => void loadSyncStatus({ silent: true }), 5000);
    return () => clearInterval(id);
  }, [connectOrgId, loadSyncStatus, trackerGateLoading, trackerReady]);

  async function postIncrementalSync() {
    if (!connectOrgId) return;
    try {
      await postAdminIncrementalSync(connectOrgId);
      toast.success(t('admin.sync.incrementalQueued'));
      await loadSyncStatus({ silent: true });
    } catch (error) {
      toast.error(readApiErrorMessage(error, t('admin.sync.enqueueIncrementalFailed')));
    }
  }

  async function postFullRescan() {
    if (!connectOrgId) return;
    const confirmed = await confirm(t('admin.sync.fullRescanConfirm'), {
      confirmText: t('admin.sync.fullRescanRun'),
      title: t('admin.sync.fullRescanTitle'),
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      const data = await postAdminFullRescanSync(connectOrgId);
      const jobSuffix = data.jobId ? ` (${data.jobId})` : '';
      toast.success(t('admin.sync.fullRescanQueued', { jobSuffix }));
      await loadSyncStatus({ silent: true });
    } catch (error) {
      const status = readApiErrorStatus(error);
      const ax = error as AxiosError<{
        error?: string;
        retryAfterSeconds?: number;
      }>;
      const data = ax.response?.data;
      if (status === 429 && data?.retryAfterSeconds != null) {
        toast.error(
          t('admin.sync.fullRescanRetry', {
            message: data.error ?? t('admin.sync.cooldownFallback'),
            seconds: String(data.retryAfterSeconds),
          })
        );
      } else {
        toast.error(readApiErrorMessage(error, t('admin.sync.fullRescanEnqueueFailed')));
      }
    }
  }

  async function saveSyncSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!connectOrgId) return;
    const interval = Number.parseInt(formIntervalMinutes, 10);
    const overlap = Number.parseInt(formOverlapMinutes, 10);
    const maxIssues = Number.parseInt(formMaxIssuesPerRun, 10);
    if (!Number.isFinite(interval) || !Number.isFinite(overlap) || !Number.isFinite(maxIssues)) {
      toast.error(t('admin.sync.integersOnlyError'));
      return;
    }
    const teamQueueKeys = new Set(syncView?.teamQueueKeys ?? []);
    const body: Record<string, unknown> = {
      enabled: formEnabled,
      extraQueueKeys: formExtraQueueKeys.filter((key) => !teamQueueKeys.has(key)),
      intervalMinutes: interval,
      maxIssuesPerRun: maxIssues,
      overlapMinutes: overlap,
    };
    setSettingsSaving(true);
    try {
      await patchAdminSyncSettings(connectOrgId, body);
      toast.success(t('admin.sync.settingsSaved'));
      setSettingsDirty(false);
      await loadSyncStatus({ silent: true });
    } catch (error) {
      const status = readApiErrorStatus(error);
      const ax = error as AxiosError<{ code?: string; error?: string; issues?: unknown }>;
      const data = ax.response?.data;
      if (status === 422) {
        toast.error(data?.error ?? data?.code ?? t('admin.sync.platformValidationFailed'));
      } else if (status === 400 && data?.issues) {
        toast.error(data.error ?? t('admin.sync.invalidFields'));
      } else {
        toast.error(readApiErrorMessage(error, t('admin.sync.saveFailed')));
      }
    } finally {
      setSettingsSaving(false);
    }
  }

  if (!connectOrgId) {
    return (
      <>
        {DialogComponent}
        <p className={`text-sm ${muted}`}>{t('admin.common.pickOrgForSync')}</p>
      </>
    );
  }

  if (!EXPORTER_ENABLED) {
    return null;
  }

  if (trackerGateLoading || !trackerReady) {
    return (
      <>
        {DialogComponent}
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-sm text-ds-text-muted">
          {trackerGateLoading
            ? t('admin.common.loading')
            : translateIssueTrackerProviderMessage(
                t,
                issueTrackerProviderKind,
                'admin.common.redirectingToTrackerSettings'
              )}
        </div>
      </>
    );
  }

  return (
    <>
      {DialogComponent}
      <AdminSyncSection
      connectOrgId={connectOrgId}
      formEnabled={formEnabled}
      formExtraQueueKeys={formExtraQueueKeys}
      formIntervalMinutes={formIntervalMinutes}
      formMaxIssuesPerRun={formMaxIssuesPerRun}
      formOverlapMinutes={formOverlapMinutes}
      settingsSaving={settingsSaving}
      syncStatusLoading={syncStatusLoading}
      syncView={syncView}
      onFormEnabledChange={(v) => {
        setSettingsDirty(true);
        setFormEnabled(v);
      }}
      onFormExtraQueueKeysChange={(queueKeys) => {
        setSettingsDirty(true);
        setFormExtraQueueKeys(queueKeys);
      }}
      onFormIntervalChange={(v) => {
        setSettingsDirty(true);
        setFormIntervalMinutes(v);
      }}
      onFormMaxIssuesChange={(v) => {
        setSettingsDirty(true);
        setFormMaxIssuesPerRun(v);
      }}
      onFormOverlapChange={(v) => {
        setSettingsDirty(true);
        setFormOverlapMinutes(v);
      }}
      onFullRescan={() => void postFullRescan()}
      onIncrementalSync={() => void postIncrementalSync()}
      onRefreshStatus={() => void loadSyncStatus({ silent: false })}
      onSaveSettings={(e) => void saveSyncSettings(e)}
    />
    </>
  );
}

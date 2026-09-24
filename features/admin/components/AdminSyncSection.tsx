'use client';

import type { AdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';
import type { FormEvent } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { AdminSyncProgressPanel } from '@/features/admin/AdminSyncProgressPanel';
import { cardBody, cardShell, muted, pageStack } from '@/features/admin/adminUiTokens';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminSyncStateBlock } from '@/features/admin/components/AdminSyncSectionBlocks';
import { AdminSyncSectionSettingsForm } from '@/features/admin/components/AdminSyncSectionSettingsForm';

interface AdminSyncSectionProps {
  'aria-labelledby'?: string;
  connectOrgId: string;
  formEnabled: boolean;
  formExtraQueueKeys: string[];
  formIntervalMinutes: string;
  formMaxIssuesPerRun: string;
  formOverlapMinutes: string;
  id?: string;
  settingsSaving: boolean;
  syncStatusLoading: boolean;
  syncView: AdminSyncStatusPayload | null;
  onFormEnabledChange: (value: boolean) => void;
  onFormExtraQueueKeysChange: (queueKeys: string[]) => void;
  onFormIntervalChange: (value: string) => void;
  onFormMaxIssuesChange: (value: string) => void;
  onFormOverlapChange: (value: string) => void;
  onFullRescan: () => void;
  onIncrementalSync: () => void;
  onRefreshStatus: () => void;
  onSaveSettings: (e: FormEvent) => void;
}

export function AdminSyncSection({
  'aria-labelledby': ariaLabelledBy,
  connectOrgId,
  id,
  formEnabled,
  formExtraQueueKeys,
  formIntervalMinutes,
  formMaxIssuesPerRun,
  formOverlapMinutes,
  settingsSaving,
  syncStatusLoading,
  syncView,
  onFormEnabledChange,
  onFormExtraQueueKeysChange,
  onFormIntervalChange,
  onFormMaxIssuesChange,
  onFormOverlapChange,
  onFullRescan,
  onIncrementalSync,
  onRefreshStatus,
  onSaveSettings,
}: AdminSyncSectionProps) {
  const { has, t } = useI18n();
  return (
    <div className={pageStack}>
      <AdminPageHeader description={t('admin.syncPage.intro')} title={t('admin.syncPage.title')} />
      <section aria-labelledby={ariaLabelledBy} className={cardShell} id={id} role="tabpanel">
      <div className={`${cardBody} space-y-4`}>
        <div className="flex flex-wrap items-center gap-3 gap-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              className="px-3.5 py-2"
              disabled={syncStatusLoading || !connectOrgId}
              type="button"
              variant="outline"
              onClick={onRefreshStatus}
            >
              {syncStatusLoading ? t('admin.syncPage.refreshLoading') : t('admin.syncPage.refresh')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 sm:border-l sm:border-ds-border-subtle sm:pl-3">
            <Button
              className="px-3.5 py-2"
              disabled={!connectOrgId}
              type="button"
              variant="outline"
              onClick={onIncrementalSync}
            >
              {t('admin.syncPage.runNow')}
            </Button>
            <Button
              className="px-3.5 py-2"
              disabled={!connectOrgId}
              type="button"
              variant="warning"
              onClick={onFullRescan}
            >
              {t('admin.syncPage.fullRescan')}
            </Button>
          </div>
        </div>
        {syncView ? <AdminSyncProgressPanel mutedClass={muted} syncView={syncView} /> : null}

        {syncView ? (
          <div className="space-y-4">
            <AdminSyncStateBlock has={has} syncView={syncView} t={t} />
            <AdminSyncSectionSettingsForm
              connectOrgId={connectOrgId}
              formEnabled={formEnabled}
              formExtraQueueKeys={formExtraQueueKeys}
              formIntervalMinutes={formIntervalMinutes}
              formMaxIssuesPerRun={formMaxIssuesPerRun}
              formOverlapMinutes={formOverlapMinutes}
              settingsSaving={settingsSaving}
              teamQueueKeys={syncView.teamQueueKeys}
              onFormEnabledChange={onFormEnabledChange}
              onFormExtraQueueKeysChange={onFormExtraQueueKeysChange}
              onFormIntervalChange={onFormIntervalChange}
              onFormMaxIssuesChange={onFormMaxIssuesChange}
              onFormOverlapChange={onFormOverlapChange}
              onSaveSettings={onSaveSettings}
            />
          </div>
        ) : null}

        {!syncView && syncStatusLoading && connectOrgId ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.syncPage.loading')}</p>
        ) : null}
      </div>
      </section>
    </div>
  );
}

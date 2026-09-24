'use client';

import type { FormEvent } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import {
  adminFormCheckbox,
  field,
  hCard,
  label,
  muted,
} from '@/features/admin/adminUiTokens';
import { AdminSyncQueuesField } from '@/features/admin/components/AdminSyncQueuesField';

interface AdminSyncSectionSettingsFormProps {
  connectOrgId: string;
  formEnabled: boolean;
  formExtraQueueKeys: string[];
  formIntervalMinutes: string;
  formMaxIssuesPerRun: string;
  formOverlapMinutes: string;
  settingsSaving: boolean;
  teamQueueKeys: string[];
  onFormEnabledChange: (value: boolean) => void;
  onFormExtraQueueKeysChange: (queueKeys: string[]) => void;
  onFormIntervalChange: (value: string) => void;
  onFormMaxIssuesChange: (value: string) => void;
  onFormOverlapChange: (value: string) => void;
  onSaveSettings: (e: FormEvent) => void;
}

export function AdminSyncSectionSettingsForm({
  connectOrgId,
  formEnabled,
  formExtraQueueKeys,
  formIntervalMinutes,
  formMaxIssuesPerRun,
  formOverlapMinutes,
  settingsSaving,
  teamQueueKeys,
  onFormEnabledChange,
  onFormExtraQueueKeysChange,
  onFormIntervalChange,
  onFormMaxIssuesChange,
  onFormOverlapChange,
  onSaveSettings,
}: AdminSyncSectionSettingsFormProps) {
  const { t } = useI18n();

  return (
    <form
      className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-200"
      onSubmit={onSaveSettings}
    >
      <h3 className={hCard}>{t('admin.syncPage.settingsTitle')}</h3>
      <p className={`text-xs ${muted}`}>{t('admin.syncPage.settingsHint')}</p>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          checked={formEnabled}
          className={adminFormCheckbox}
          type="checkbox"
          onChange={(e) => onFormEnabledChange(e.target.checked)}
        />
        {t('admin.syncPage.syncEnabled')}
      </label>
      <AdminSyncQueuesField
        connectOrgId={connectOrgId}
        disabled={settingsSaving}
        extraQueueKeys={formExtraQueueKeys}
        teamQueueKeys={teamQueueKeys}
        onExtraQueueKeysChange={onFormExtraQueueKeysChange}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="set-int">
            {t('admin.syncPage.intervalMinutes')}
          </label>
          <input
            className={field}
            id="set-int"
            inputMode="numeric"
            type="text"
            value={formIntervalMinutes}
            onChange={(e) => onFormIntervalChange(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="set-ov">
            {t('admin.syncPage.overlapMinutes')}
          </label>
          <input
            className={field}
            id="set-ov"
            inputMode="numeric"
            type="text"
            value={formOverlapMinutes}
            onChange={(e) => onFormOverlapChange(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="set-max">
            {t('admin.syncPage.maxIssues')}
          </label>
          <input
            className={field}
            id="set-max"
            inputMode="numeric"
            type="text"
            value={formMaxIssuesPerRun}
            onChange={(e) => onFormMaxIssuesChange(e.target.value)}
          />
        </div>
      </div>
      <Button
        className="px-3.5 py-2"
        disabled={settingsSaving || !connectOrgId}
        type="submit"
        variant="primary"
      >
        {settingsSaving ? t('admin.syncPage.saveSaving') : t('admin.syncPage.save')}
      </Button>
    </form>
  );
}

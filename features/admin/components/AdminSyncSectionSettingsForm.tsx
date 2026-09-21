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

interface AdminSyncSectionSettingsFormProps {
  connectOrgId: string;
  formEnabled: boolean;
  formIntervalMinutes: string;
  formMaxIssuesPerRun: string;
  formOverlapMinutes: string;
  formWindowEnd: string;
  formWindowStart: string;
  settingsSaving: boolean;
  onFormEnabledChange: (value: boolean) => void;
  onFormIntervalChange: (value: string) => void;
  onFormMaxIssuesChange: (value: string) => void;
  onFormOverlapChange: (value: string) => void;
  onFormWindowEndChange: (value: string) => void;
  onFormWindowStartChange: (value: string) => void;
  onSaveSettings: (e: FormEvent) => void;
}

export function AdminSyncSectionSettingsForm({
  connectOrgId,
  formEnabled,
  formIntervalMinutes,
  formMaxIssuesPerRun,
  formOverlapMinutes,
  formWindowEnd,
  formWindowStart,
  settingsSaving,
  onFormEnabledChange,
  onFormIntervalChange,
  onFormMaxIssuesChange,
  onFormOverlapChange,
  onFormWindowEndChange,
  onFormWindowStartChange,
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="set-ws">
            {t('admin.syncPage.windowStart')}
          </label>
          <input
            className={`${field} font-mono text-xs`}
            id="set-ws"
            placeholder="2026-01-01T00:00:00.000Z"
            title={t('admin.syncPage.windowStartTitle')}
            type="text"
            value={formWindowStart}
            onChange={(e) => onFormWindowStartChange(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="set-we">
            {t('admin.syncPage.windowEnd')}
          </label>
          <input
            className={`${field} font-mono text-xs`}
            id="set-we"
            placeholder="2026-01-02T00:00:00.000Z"
            title={t('admin.syncPage.windowEndTitle')}
            type="text"
            value={formWindowEnd}
            onChange={(e) => onFormWindowEndChange(e.target.value)}
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

'use client';

import type { AdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';

import { useI18n } from '@/contexts/LanguageContext';
import { adminFormCheckbox } from '@/features/admin/adminUiTokens';

interface AdminSyncSectionRawDebugProps {
  showSyncRaw: boolean;
  syncView: AdminSyncStatusPayload | null;
  onShowSyncRawChange: (value: boolean) => void;
}

export function AdminSyncSectionRawDebug({
  onShowSyncRawChange,
  showSyncRaw,
  syncView,
}: AdminSyncSectionRawDebugProps) {
  const { t } = useI18n();

  return (
    <div className="border-t border-ds-border-subtle pt-4">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <input
          checked={showSyncRaw}
          className={adminFormCheckbox}
          type="checkbox"
          onChange={(e) => onShowSyncRawChange(e.target.checked)}
        />
        {t('admin.syncPage.showRawDebug')}
      </label>
      {showSyncRaw && syncView ? (
        <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
          {JSON.stringify(syncView, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

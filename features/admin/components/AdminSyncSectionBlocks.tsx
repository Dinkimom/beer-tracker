'use client';

import type { AdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';

import { formatAdminDateTime } from '@/features/admin/adminFormatters';
import { hCard } from '@/features/admin/adminUiTokens';
import { AdminInlineAlert } from '@/features/admin/components/AdminInlineAlert';
import { AdminSyncLastSyncRunLine } from '@/features/admin/components/AdminSyncLastSyncRunLine';

export function AdminSyncStateBlock({
  has,
  syncView,
  t,
}: {
  has: (key: string) => boolean;
  syncView: AdminSyncStatusPayload;
  t: (key: string, params?: Record<string, number | string>) => string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-200">
      <h3 className={hCard}>{t('admin.syncPage.stateTitle')}</h3>
      <ul className="mt-2 space-y-1.5 text-gray-700 dark:text-gray-300">
        <li>
          {t('admin.syncPage.initialImportLabel')}{' '}
          {syncView.organization.initialSyncCompletedAt ? (
            <span className="text-green-700 dark:text-green-400">
              {t('admin.syncPage.initialReady', {
                date: formatAdminDateTime(syncView.organization.initialSyncCompletedAt),
              })}
            </span>
          ) : (
            <span className="text-amber-800 dark:text-amber-200">{t('admin.syncPage.initialPending')}</span>
          )}
        </li>
        {syncView.lastSyncRun ? (
          <AdminSyncLastSyncRunLine has={has} run={syncView.lastSyncRun} t={t} />
        ) : (
          <li className="text-gray-500 dark:text-gray-400">{t('admin.syncPage.noRunsYet')}</li>
        )}
        <li>
          {t('admin.syncPage.nextAutoRunPrefix')} {formatAdminDateTime(syncView.organization.syncNextRunAt)}
          {!syncView.syncCronSecretConfigured ? (
            <span className="mt-1 block text-amber-800 dark:text-amber-200">{t('admin.syncPage.cronSecretWarning')}</span>
          ) : null}
        </li>
        <li>
          {t('admin.syncPage.backgroundJobsLabel')}{' '}
          {syncView.redisConfigured ? (
            <span className="text-green-700 dark:text-green-400">{t('admin.syncPage.redisAvailable')}</span>
          ) : (
            <span className="text-amber-800 dark:text-amber-200">{t('admin.syncPage.redisUnavailable')}</span>
          )}
        </li>
      </ul>
      {!syncView.syncValidation.ok ? (
        <div className="mt-4">
          <AdminInlineAlert variant="warning">
            {t('admin.syncPage.validationWarning', { message: syncView.syncValidation.message })}
          </AdminInlineAlert>
        </div>
      ) : null}
    </div>
  );
}

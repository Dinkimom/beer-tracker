'use client';

type Translate = (key: string) => string;

export function AdminSyncProgressRunningSection({
  detailLine,
  mutedClass,
  t,
}: {
  detailLine: string | null;
  mutedClass: string;
  t: Translate;
}) {
  return (
    <div className="space-y-2">
      <div
        aria-busy="true"
        aria-label={t('admin.syncPage.syncBusyAria')}
        className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        role="progressbar"
      >
        <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500/70 dark:bg-blue-400/70" />
      </div>
      {detailLine ? (
        <p className="text-sm text-gray-800 dark:text-gray-200">{detailLine}</p>
      ) : (
        <p className={`text-sm ${mutedClass}`}>{t('admin.syncPage.estimatingSync')}</p>
      )}
    </div>
  );
}

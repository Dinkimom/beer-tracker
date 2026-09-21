type SyncProgressTranslate = (
  key: string,
  params?: Record<string, number | string>,
) => string;

export function describeFullSyncCheckpoint(
  stats: Record<string, unknown>,
  t: SyncProgressTranslate,
): string | null {
  const raw = stats.full_sync_checkpoint;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const c = raw as Record<string, unknown>;
  const qi = c.queue_index;
  const qt = c.queue_total;
  const page = c.page;
  const tp = c.total_pages;
  const total = stats.issues_total_so_far;
  const queue = typeof c.queue_key === 'string' ? c.queue_key : '';
  if (
    typeof qi !== 'number' ||
    typeof qt !== 'number' ||
    typeof page !== 'number' ||
    typeof tp !== 'number'
  ) {
    return null;
  }
  const totalPart =
    typeof total === 'number'
      ? t('admin.syncProgress.statsCheckpoint.totalSuffix', { count: total })
      : '';
  return t('admin.syncProgress.statsCheckpoint.boardLine', {
    qi,
    qt,
    page,
    tp,
    total: totalPart,
    queue,
  });
}

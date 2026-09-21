type SyncProgressTranslate = (
  key: string,
  params?: Record<string, number | string>,
) => string;

export function describeFetchBoardsProgress(
  meta: Record<string, unknown>,
  t: SyncProgressTranslate,
): string | null {
  const qi = meta.queueIndex;
  const qt = meta.queueTotal;
  const page = meta.page;
  const tp = meta.totalPages;
  const ic = meta.issuesCollected;
  const queue = typeof meta.queueKey === 'string' ? meta.queueKey : '';
  if (
    typeof qi !== 'number' ||
    typeof qt !== 'number' ||
    typeof page !== 'number' ||
    typeof tp !== 'number'
  ) {
    return null;
  }
  const issues =
    typeof ic === 'number'
      ? t('admin.syncProgress.meta.issuesSuffix', { count: ic })
      : '';
  return t('admin.syncProgress.meta.fetchBoards', { qi, qt, page, tp, issues, queue });
}

export function describeSimpleCountPhase(
  meta: Record<string, unknown>,
  countKey: string,
  messageKey: string,
  t: SyncProgressTranslate,
): string | null {
  const count = meta[countKey];
  if (typeof count !== 'number') {
    return null;
  }
  return t(messageKey, { count });
}

export function describeUpsertDoneProgress(
  meta: Record<string, unknown>,
  t: SyncProgressTranslate,
): string | null {
  const count = meta.issues_upserted;
  if (typeof count !== 'number') {
    return null;
  }
  return t('admin.syncProgress.meta.upsertDone', { count });
}

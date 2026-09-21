import {
  describeFetchBoardsProgress,
  describeSimpleCountPhase,
  describeUpsertDoneProgress,
} from './syncProgressForAdminPhaseHelpers';

type SyncProgressTranslate = (
  key: string,
  params?: Record<string, number | string>,
) => string;

type SyncProgressPhaseHandler = (
  meta: Record<string, unknown>,
  t: SyncProgressTranslate,
) => string | null;

export function buildSyncProgressPhaseHandlers(
  changelogProgressLineFromJobMeta: (
    meta: Record<string, unknown>,
    t: SyncProgressTranslate,
  ) => string | null,
): Record<string, SyncProgressPhaseHandler> {
  return {
    fetch_queues: (meta, t) => describeFetchBoardsProgress(meta, t),
    list_queues: (meta, t) =>
      describeSimpleCountPhase(meta, 'queues_total', 'admin.syncProgress.meta.listBoards', t),
    fetch_start: (meta, t) =>
      describeSimpleCountPhase(meta, 'queues_total', 'admin.syncProgress.meta.fetchStart', t),
    upsert_start: (_meta, t) => t('admin.syncProgress.meta.upsertStart'),
    changelog_fetch: (meta, t) => changelogProgressLineFromJobMeta(meta, t),
    upsert_done: (meta, t) => describeUpsertDoneProgress(meta, t),
    no_queues: (_meta, t) => t('admin.syncProgress.meta.noBoards'),
  };
}

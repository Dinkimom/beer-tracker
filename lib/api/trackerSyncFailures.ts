import type { TrackerSyncFailure } from '@/lib/sprints/taskPositionsTrackerSync';

/** Событие окна: сервер сохранил позицию, но не смог записать исполнителя или даты в трекер. */
export const TRACKER_SYNC_FAILED_EVENT = 'beer-tracker:tracker-sync-failed';

function isTrackerSyncFailure(value: unknown): value is TrackerSyncFailure {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Partial<TrackerSyncFailure>;
  return (rec.field === 'assignee' || rec.field === 'dates') && typeof rec.issueKey === 'string';
}

/** Достаёт `trackerSyncFailures` из ответа роута позиций и сообщает о них UI. */
export function reportTrackerSyncFailures(responseData: unknown): void {
  const raw = (responseData as { trackerSyncFailures?: unknown } | null)?.trackerSyncFailures;
  if (!Array.isArray(raw) || typeof window === 'undefined') return;
  const failures = raw.filter(isTrackerSyncFailure);
  if (failures.length === 0) return;
  window.dispatchEvent(new CustomEvent<TrackerSyncFailure[]>(TRACKER_SYNC_FAILED_EVENT, { detail: failures }));
}
